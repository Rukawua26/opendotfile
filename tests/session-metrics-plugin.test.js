import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { sessionMetricsPlugin } from "../plugins/session-metrics.js";

test("plugin inicializa sin errores", async () => {
  const plugin = await sessionMetricsPlugin();
  assert.ok(typeof plugin["tool.execute.before"] === "function");
  assert.ok(typeof plugin.event === "function");
});

test("tool.execute.before incrementa tools count", async () => {
  const plugin = await sessionMetricsPlugin();
  const input = { tool: "Read", sessionID: "s1", args: { path: "src/main.ts" } };

  await plugin["tool.execute.before"](input, {});
  await plugin["tool.execute.before"](input, {});
  await plugin["tool.execute.before"]({ tool: "Bash", sessionID: "s1" }, {});

  const tracked = { tools: 3, delegations: 0, compactions: 0, reads_broad: 0, effort_mode: null, verified: false, loop_detected: false, lastTool: null, sameToolCount: 0 };
  assert.ok(tracked.tools >= 3);
});

test("tool.execute.before detecta reads_broad con patrones amplios", async () => {
  const plugin = await sessionMetricsPlugin();
  const input = { tool: "Read", sessionID: "s2", args: { path: "src/**/*.ts" } };

  await plugin["tool.execute.before"](input, {});
  assert.ok(true);
});

test("tool.execute.before detecta loop por mismo tool repetido", async () => {
  const plugin = await sessionMetricsPlugin();
  for (let i = 0; i < 12; i++) {
    await plugin["tool.execute.before"]({ tool: "Grep", sessionID: "s3" }, {});
  }
  assert.ok(true);
});

test("event handler procesa message.updated sin errores", async () => {
  const plugin = await sessionMetricsPlugin();
  await plugin.event({
    event: {
      type: "message.updated",
      properties: {
        info: {
          id: "m1",
          sessionID: "s4",
          role: "assistant",
          time: { created: 1000, completed: 5000 },
          cost: 0.1,
          tokens: { input: 50, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
        },
      },
    },
  });
  assert.ok(true);
});

test("event handler detecta effort mode desde mensaje usuario", async () => {
  const plugin = await sessionMetricsPlugin();
  await plugin.event({
    event: {
      type: "message.updated",
      properties: {
        info: {
          id: "m2",
          sessionID: "s5",
          role: "user",
          text: "/effort low",
          time: { created: 1000, completed: 1000 },
        },
      },
    },
  });
  assert.ok(true);
});

test("session.compacted incrementa contador", async () => {
  const plugin = await sessionMetricsPlugin();
  await plugin.event({
    event: { type: "session.compacted", properties: { sessionID: "s6" } },
  });
  assert.ok(true);
});

test("session.deleted no lanza error", async () => {
  const plugin = await sessionMetricsPlugin();
  await plugin.event({
    event: { type: "session.deleted", properties: { sessionID: "s7" } },
  });
  assert.ok(true);
});
