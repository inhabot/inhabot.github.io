import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDemoResponse } from "./lib/demo.mjs";
import { normalizeMissionStates } from "./lib/mission-policy.mjs";
import { createMissionResponse } from "./lib/openai.mjs";
import { getPublicScenarios, scenarios } from "./lib/scenarios.mjs";
import { checkSensitiveInput } from "./lib/safety.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(__dirname, "public");

loadLocalEnv(join(__dirname, ".env.local"));

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4175);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN?.trim().replace(/\/+$/u, "") || "";
const MAX_BODY_BYTES = 18_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 24;
const rateBuckets = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) return;

  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/gu, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function setSecurityHeaders(res, isApi = false) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  if (isApi) res.setHeader("Cache-Control", "no-store");
}

function sendJson(res, status, payload) {
  setSecurityHeaders(res, true);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function validSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("요청 내용이 너무 큽니다.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("요청 형식이 올바르지 않습니다.");
    error.status = 400;
    throw error;
  }
}

function checkRateLimit(req, sessionId) {
  const now = Date.now();
  const address = req.socket.remoteAddress || "local";
  const key = `${address}:${String(sessionId).slice(0, 80)}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= RATE_MAX_REQUESTS;
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (message) =>
        message &&
        typeof message.speaker === "string" &&
        typeof message.text === "string"
    )
    .slice(-12)
    .map((message) => ({
      speaker: message.speaker.slice(0, 20),
      text: message.text.slice(0, 300)
    }));
}

async function handleChat(req, res) {
  if (!validSameOrigin(req)) {
    return sendJson(res, 403, { error: "허용되지 않은 요청입니다." });
  }

  const body = await readJsonBody(req);
  const scenario = scenarios[body.scenarioId];
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (!scenario || sessionId.length < 8) {
    return sendJson(res, 400, { error: "채팅방 또는 세션 정보가 올바르지 않습니다." });
  }

  if (!checkRateLimit(req, sessionId)) {
    return sendJson(res, 429, {
      error: "잠시 대화 횟수를 모두 사용했습니다. 미션을 검토한 뒤 조금 후에 다시 시도해주세요."
    });
  }

  const safety = checkSensitiveInput(body.studentText);
  const missionStates = normalizeMissionStates(body.missionStates, scenario);
  if (!safety.ok) {
    return sendJson(res, safety.type === "length" || safety.type === "empty" ? 400 : 200, {
      mode: "local-safety",
      type: safety.type,
      messages: [{ speaker: "안전 안내", text: safety.message }],
      missions: scenario.missions.map((mission) => ({
        id: mission.id,
        status: missionStates[mission.id].status,
        reason: "안전 안내 후 다시 시도합니다."
      })),
      coachNote:
        safety.type === "privacy"
          ? "실제 정보를 가상 표현으로 바꾼 뒤 다시 작성해보세요."
          : safety.type === "profanity"
            ? "욕설을 빼고, 내가 느낀 감정과 상대에게 바라는 행동을 구체적으로 표현해보세요."
          : "이 화면을 교사에게 보여주세요."
    });
  }

  const messages = normalizeMessages(body.messages);
  if (!OPENAI_API_KEY) {
    return sendJson(res, 200, buildDemoResponse(scenario, safety.text, missionStates));
  }

  try {
    const result = await createMissionResponse({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      scenario,
      messages,
      studentText: safety.text,
      missionStates,
      sessionId
    });
    return sendJson(res, 200, result);
  } catch (error) {
    console.error(`[OpenAI] ${error.status || "network"} ${new Date().toISOString()}`);
    return sendJson(res, 502, {
      error:
        "GPT 응답을 가져오지 못했습니다. 대화는 저장되지 않았습니다. 잠시 후 다시 시도해주세요."
    });
  }
}

async function serveStatic(req, res) {
  const requestPath =
    req.url === "/" ? "/index.html" : new URL(req.url, "http://local").pathname;
  const normalizedPath = normalize(decodeURIComponent(requestPath)).replace(
    /^(\.\.[/\\])+/,
    ""
  );
  const filePath = resolve(publicDir, `.${normalizedPath}`);

  if (!filePath.startsWith(publicDir)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  try {
    const fileStat = await stat(filePath);
    const finalPath = fileStat.isDirectory() ? join(filePath, "index.html") : filePath;
    const content = await readFile(finalPath);
    setSecurityHeaders(res);
    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes[extname(finalPath)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    if (req.method === "HEAD") return res.end();
    res.end(content);
  } catch {
    setSecurityHeaders(res);
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("페이지를 찾을 수 없습니다.");
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const origin = req.headers.origin;
    if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }

    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      res.statusCode = validSameOrigin(req) ? 204 : 403;
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        mode: OPENAI_API_KEY ? "gpt" : "demo",
        model: OPENAI_API_KEY ? OPENAI_MODEL : null,
        persistence: "none"
      });
    }

    if (req.method === "GET" && url.pathname === "/api/scenarios") {
      return sendJson(res, 200, { scenarios: getPublicScenarios() });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      return await handleChat(req, res);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "지원하지 않는 요청입니다." });
    }

    return await serveStatic(req, res);
  } catch (error) {
    console.error(`[Server] ${error.message}`);
    return sendJson(res, error.status || 500, {
      error: error.status ? error.message : "서버에서 요청을 처리하지 못했습니다."
    });
  }
});

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [key, bucket] of rateBuckets.entries()) {
    if (bucket.startedAt < cutoff) rateBuckets.delete(key);
  }
}, RATE_WINDOW_MS).unref();

server.listen(PORT, HOST, () => {
  console.log(`채팅 구조대 MVP: http://${HOST}:${PORT} (${OPENAI_API_KEY ? "GPT" : "데모"} 모드)`);
  console.log("로그인·DB 없이 동작하며 대화 원문을 서버에 저장하지 않습니다.");
});
