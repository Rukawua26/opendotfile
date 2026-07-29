import assert from "node:assert/strict";
import test from "node:test";
import { metricFromMessage } from "../lib/session-metrics.js";

function msg(overrides = {}) {
  return {
    id: "msg1",
    sessionID: "session_abc",
    role: "assistant",
    time: { created: 1000, completed: 5000 },
    cost: 0.5,
    tokens: { input: 100, output: 50, reasoning: 10, cache: { read: 20, write: 5 } },
    providerID: "openai",
    modelID: "gpt-4",
    agent: "default",
    mode: "default",
    ...overrides,
  };
}

test("metric incluye efficiency fields con valores default", () => {
  const result = metricFromMessage(msg(), { tools: 5, delegations: 2, compactions: 1 });
  assert.equal(result.tools, 5);
  assert.equal(result.delegations, 2);
  assert.equal(result.compactions, 1);
  assert.equal(result.reads_broad, 0);
  assert.equal(result.effort_mode, null);
  assert.equal(result.verified, false);
  assert.equal(result.loop_detected, false);
});

test("metric refleja efficiency fields pasados en state", () => {
  const result = metricFromMessage(msg(), {
    tools: 10,
    delegations: 3,
    compactions: 2,
    reads_broad: 4,
    effort_mode: "low",
    verified: true,
    loop_detected: false,
  });
  assert.equal(result.reads_broad, 4);
  assert.equal(result.effort_mode, "low");
  assert.equal(result.verified, true);
  assert.equal(result.loop_detected, false);
});

test("metric refleja loop_detected true", () => {
  const result = metricFromMessage(msg(), { loop_detected: true });
  assert.equal(result.loop_detected, true);
});

test("metric ignora mensajes no assistant", () => {
  const result = metricFromMessage(msg({ role: "user" }));
  assert.equal(result, null);
});

test("metric ignora mensajes sin time.completed", () => {
  const result = metricFromMessage(msg({ time: { created: 1000 } }));
  assert.equal(result, null);
});

test("metric existente no se rompe con nuevos campos", () => {
  const result = metricFromMessage(msg(), { tools: 3, delegations: 1, compactions: 0 });
  assert.equal(result.timestamp, new Date(5000).toISOString());
  assert.equal(typeof result.session, "string");
  assert.equal(result.message, "msg1");
  assert.equal(result.agent, "default");
  assert.equal(result.provider, "openai");
  assert.equal(result.model, "gpt-4");
  assert.equal(result.duration_ms, 4000);
  assert.equal(result.cost, 0.5);
  assert.deepEqual(result.tokens, { input: 100, output: 50, reasoning: 10, cache_read: 20, cache_write: 5 });
  assert.equal(result.failed, false);
});
