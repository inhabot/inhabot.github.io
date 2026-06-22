import { normalizeMissionStates } from "./lib/mission-policy.mjs";
import { createMissionResponse } from "./lib/openai.mjs";
import { getPublicScenarios, scenarios } from "./lib/scenarios.mjs";
import { checkSensitiveInput } from "./lib/safety.mjs";

const DEFAULT_ALLOWED_ORIGIN = "https://inhabot.github.io";
const DEFAULT_MODEL = "gpt-5.5";
const MAX_BODY_BYTES = 18_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 24;
const rateBuckets = new Map();
const encoder = new TextEncoder();

function allowedOrigin(env) {
  return String(env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN).replace(/\/+$/u, "");
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || origin === allowedOrigin(env);
}

function isAllowedChatOrigin(request, env) {
  return request.headers.get("Origin") === allowedOrigin(env);
}

function responseHeaders(request, env) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  });
  const origin = request.headers.get("Origin");
  if (origin && origin === allowedOrigin(env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

function sendJson(request, env, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders(request, env)
  });
}

async function readJsonBody(request) {
  const declaredSize = Number(request.headers.get("Content-Length") || 0);
  if (declaredSize > MAX_BODY_BYTES) {
    const error = new Error("요청 내용이 너무 큽니다.");
    error.status = 413;
    throw error;
  }

  const text = await request.text();
  if (encoder.encode(text).byteLength > MAX_BODY_BYTES) {
    const error = new Error("요청 내용이 너무 큽니다.");
    error.status = 413;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("요청 형식이 올바르지 않습니다.");
    error.status = 400;
    throw error;
  }
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

async function checkRateLimit(request, env, sessionId) {
  const address =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown";

  if (env.SESSION_RATE_LIMITER?.limit) {
    const result = await env.SESSION_RATE_LIMITER.limit({
      key: `${address}:${String(sessionId).slice(0, 80)}`
    });
    if (!result.success) return false;
  }

  if (env.IP_RATE_LIMITER?.limit) {
    const result = await env.IP_RATE_LIMITER.limit({ key: address });
    if (!result.success) return false;
  }

  const now = Date.now();
  const key = `${address}:${String(sessionId).slice(0, 80)}`;
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= RATE_MAX_REQUESTS;
}

async function handleChat(request, env) {
  const body = await readJsonBody(request);
  const scenario = scenarios[body.scenarioId];
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (!scenario || sessionId.length < 8) {
    return sendJson(request, env, 400, {
      error: "채팅방 또는 세션 정보가 올바르지 않습니다."
    });
  }

  if (!(await checkRateLimit(request, env, sessionId))) {
    return sendJson(request, env, 429, {
      error: "잠시 대화 횟수를 모두 사용했습니다. 미션을 검토한 뒤 조금 후에 다시 시도해주세요."
    });
  }

  const safety = checkSensitiveInput(body.studentText);
  const missionStates = normalizeMissionStates(body.missionStates, scenario);
  if (!safety.ok) {
    return sendJson(
      request,
      env,
      safety.type === "length" || safety.type === "empty" ? 400 : 200,
      {
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
      }
    );
  }

  const apiKey = String(env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return sendJson(request, env, 503, {
      error: "GPT API가 아직 배포 서버에 설정되지 않았습니다."
    });
  }

  try {
    const result = await createMissionResponse({
      apiKey,
      model: String(env.OPENAI_MODEL || DEFAULT_MODEL).trim(),
      scenario,
      messages: normalizeMessages(body.messages),
      studentText: safety.text,
      missionStates,
      sessionId
    });
    return sendJson(request, env, 200, result);
  } catch (error) {
    console.error(`[OpenAI] ${error.status || "network"} ${new Date().toISOString()}`);
    return sendJson(request, env, 502, {
      error:
        "GPT 응답을 가져오지 못했습니다. 대화는 저장되지 않았습니다. 잠시 후 다시 시도해주세요."
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      if (!isAllowedOrigin(request, env)) {
        return sendJson(request, env, 403, { error: "허용되지 않은 요청입니다." });
      }
      const headers = responseHeaders(request, env);
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.delete("Content-Type");
      return new Response(null, { status: 204, headers });
    }

    if (!isAllowedOrigin(request, env)) {
      return sendJson(request, env, 403, { error: "허용되지 않은 요청입니다." });
    }

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        const configured = Boolean(String(env.OPENAI_API_KEY || "").trim());
        return sendJson(request, env, configured ? 200 : 503, {
          ok: configured,
          mode: configured ? "gpt" : "unconfigured",
          model: configured ? String(env.OPENAI_MODEL || DEFAULT_MODEL).trim() : null,
          persistence: "none"
        });
      }

      if (request.method === "GET" && url.pathname === "/api/scenarios") {
        return sendJson(request, env, 200, { scenarios: getPublicScenarios() });
      }

      if (request.method === "POST" && url.pathname === "/api/chat") {
        if (!isAllowedChatOrigin(request, env)) {
          return sendJson(request, env, 403, {
            error: "허용된 웹사이트에서만 대화를 시작할 수 있습니다."
          });
        }
        return await handleChat(request, env);
      }

      if (url.pathname.startsWith("/api/")) {
        return sendJson(request, env, 405, { error: "지원하지 않는 요청입니다." });
      }

      return sendJson(request, env, 404, { error: "페이지를 찾을 수 없습니다." });
    } catch (error) {
      console.error(`[Worker] ${error.message}`);
      return sendJson(request, env, error.status || 500, {
        error: error.status ? error.message : "서버에서 요청을 처리하지 못했습니다."
      });
    }
  }
};
