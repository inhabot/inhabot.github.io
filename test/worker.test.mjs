import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker.mjs";

const origin = "https://inhabot.github.io";
const env = {
  ALLOWED_ORIGIN: origin,
  OPENAI_API_KEY: "test-only-key",
  OPENAI_MODEL: "gpt-5.5",
  SESSION_RATE_LIMITER: {
    async limit() {
      return { success: true };
    }
  },
  IP_RATE_LIMITER: {
    async limit() {
      return { success: true };
    }
  }
};

test("Worker health endpoint reports GPT mode without exposing the key", async () => {
  const response = await worker.fetch(
    new Request("https://chat-rescue-api.example/api/health", {
      headers: { Origin: origin }
    }),
    env
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.mode, "gpt");
  assert.equal(payload.model, "gpt-5.5");
  assert.equal(JSON.stringify(payload).includes(env.OPENAI_API_KEY), false);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
});

test("Worker serves public scenarios to the allowed Pages origin", async () => {
  const response = await worker.fetch(
    new Request("https://chat-rescue-api.example/api/scenarios", {
      headers: { Origin: origin }
    }),
    env
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(payload.scenarios), true);
  assert.equal(payload.scenarios.length, 7);
});

test("Worker rejects browser requests from other origins", async () => {
  const response = await worker.fetch(
    new Request("https://chat-rescue-api.example/api/health", {
      headers: { Origin: "https://example.com" }
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.has("Access-Control-Allow-Origin"), false);
});

test("Worker requires the Pages origin for chat requests", async () => {
  const response = await worker.fetch(
    new Request("https://chat-rescue-api.example/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }),
    env
  );

  assert.equal(response.status, 403);
});

test("Worker handles CORS preflight for GitHub Pages", async () => {
  const response = await worker.fetch(
    new Request("https://chat-rescue-api.example/api/chat", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    }),
    env
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET, POST, OPTIONS");
});
