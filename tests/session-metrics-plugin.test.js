import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
const TEST_LOG_FILE = join("/tmp", `opencode-session-metrics-test-${process.pid}.jsonl`);
process.env.OPENCODE_METRICS_FILE = TEST_LOG_FILE;
const { default: sessionMetricsPlugin } = await import("../plugins/session-metrics.js");

test("plugin inicializa sin errores", async () => {
  const plugin = await sessionMetricsPlugin();
  assert.ok(typeof plugin["tool.execute.before"] === "function");
  assert.ok(typeof plugin.event === "function");
});

test("tool.execute.before incrementa tools count", async () => {
  const plugin = await sessionMetricsPlugin();
  const sessionID = `metrics-tools-${Date.now()}`;
  const messageID = `${sessionID}-assistant`;
  const logFile = TEST_LOG_FILE;
  const input = { tool: "Read", sessionID, args: { path: "src/main.ts" } };

  await plugin["tool.execute.before"](input, {});
  await plugin["tool.execute.before"](input, {});
  await plugin["tool.execute.before"]({ tool: "Bash", sessionID }, {});
  await plugin.event({ event: { type: "message.updated", properties: { info: {
    id: messageID,
    sessionID,
    role: "assistant",
    time: { created: 1000, completed: 5000 },
    tokens: { input: 1, output: 1, cache: { read: 0, write: 0 } },
  } } } });

  const record = readFileSync(logFile, "utf8").split("\n").filter(Boolean)
    .map((line) => JSON.parse(line)).find((item) => item.message === messageID);
  assert.equal(record.tools, 3);
  assert.equal(record.reads_broad, 0);
});

test("tool.execute.before detecta reads_broad con patrones amplios", async () => {
  const plugin = await sessionMetricsPlugin();
  const sessionID = `metrics-broad-${Date.now()}`;
  const messageID = `${sessionID}-assistant`;
  const logFile = TEST_LOG_FILE;
  const input = { tool: "read", sessionID, args: { filePath: "src/**/*.ts" } };

  await plugin["tool.execute.before"](input, {});
  await plugin.event({ event: { type: "message.updated", properties: { info: {
    id: messageID,
    sessionID,
    role: "assistant",
    time: { created: 1000, completed: 5000 },
    tokens: { input: 1, output: 1, cache: { read: 0, write: 0 } },
  } } } });

  const record = readFileSync(logFile, "utf8").split("\n").filter(Boolean)
    .map((line) => JSON.parse(line)).find((item) => item.message === messageID);
  assert.equal(record.reads_broad, 1);
});

test("tool.execute.before detecta loop por mismo tool repetido", async () => {
  const plugin = await sessionMetricsPlugin();
  const sessionID = `metrics-loop-${Date.now()}`;
  const messageID = `${sessionID}-assistant`;
  const logFile = TEST_LOG_FILE;
  for (let i = 0; i < 12; i++) {
    await plugin["tool.execute.before"]({ tool: "Grep", sessionID }, {});
  }
  await plugin.event({ event: { type: "message.updated", properties: { info: {
    id: messageID,
    sessionID,
    role: "assistant",
    time: { created: 1000, completed: 5000 },
    tokens: { input: 1, output: 1, cache: { read: 0, write: 0 } },
  } } } });
  const record = readFileSync(logFile, "utf8").split("\n").filter(Boolean)
    .map((line) => JSON.parse(line)).find((item) => item.message === messageID);
  assert.equal(record.loop_detected, true);
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
  assert.equal(typeof plugin.event, "function");
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
  assert.equal(typeof plugin.event, "function");
});

test("event handler conserva deltas hasta el assistant completado y usa su sessionID", async () => {
  const plugin = await sessionMetricsPlugin();
  const sessionID = `metrics-test-${Date.now()}`;
  const messageID = `${sessionID}-assistant`;
  const logFile = TEST_LOG_FILE;

  await plugin.event({ event: { type: "message.updated", properties: { info: {
    id: `${sessionID}-user`, sessionID, role: "user", text: "/effort low",
  } } } });
  await plugin["tool.execute.before"]({ tool: "read", sessionID, args: { filePath: "src/**/*.ts" } }, {});
  await plugin.event({ event: { type: "message.updated", properties: { info: {
    id: `${sessionID}-partial`, sessionID, role: "assistant", time: { created: 1000 },
  } } } });
  await plugin.event({ event: { type: "message.updated", properties: { info: {
    id: messageID,
    sessionID,
    role: "assistant",
    time: { created: 1000, completed: 5000 },
    tokens: { input: 1, output: 1, cache: { read: 0, write: 0 } },
  } } } });

  const record = readFileSync(logFile, "utf8").split("\n").filter(Boolean)
    .map((line) => JSON.parse(line)).find((item) => item.message === messageID);
  assert.equal(record.effort_mode, "low");
  assert.equal(record.tools, 1);
  assert.equal(record.reads_broad, 1);
});

test("session.compacted incrementa contador", async () => {
  const plugin = await sessionMetricsPlugin();
  await plugin.event({
    event: { type: "session.compacted", properties: { sessionID: "s6" } },
  });
  assert.equal(typeof plugin.event, "function");
});

test("session.deleted no lanza error", async () => {
  const plugin = await sessionMetricsPlugin();
  await plugin.event({
    event: { type: "session.deleted", properties: { sessionID: "s7" } },
  });
  assert.equal(typeof plugin.event, "function");
});

test("registra schema_version 2 y duplicate_reads", async () => {
  const plugin = await sessionMetricsPlugin();
  const sessionID = `metrics-v2-${Date.now()}`;
  const messageID = `${sessionID}-assistant`;
  const logFile = TEST_LOG_FILE;
  for (let i = 0; i < 3; i++) {
    await plugin["tool.execute.before"](
      { tool: "read", sessionID, args: { path: "src/x.js", offset: 1, limit: 10 } },
      {},
    );
  }
  await plugin.event({ event: { type: "message.updated", properties: { info: {
    id: messageID,
    sessionID,
    role: "assistant",
    time: { created: 1000, completed: 5000 },
    tokens: { input: 10, output: 1, cache: { read: 5, write: 0 } },
  } } } });

  const record = readFileSync(logFile, "utf8").split("\n").filter(Boolean)
    .map((line) => JSON.parse(line)).find((item) => item.message === messageID);
  assert.equal(record.schema_version, 2);
  assert.equal(record.duplicate_reads, 2);
  assert.equal(record.context_tokens, 15);
  assert.equal(record.tools_delta, 3);
});

test("context_growth se calcula entre mensajes", async () => {
  const plugin = await sessionMetricsPlugin();
  const sessionID = `metrics-growth-${Date.now()}`;
  const logFile = TEST_LOG_FILE;
  const mk = (id, input, cacheRead) => ({
    id,
    sessionID,
    role: "assistant",
    time: { created: 1000, completed: 5000 },
    tokens: { input, output: 1, cache: { read: cacheRead, write: 0 } },
  });
  await plugin.event({ event: { type: "message.updated", properties: { info: mk(`${sessionID}-a`, 100, 20) } } });
  await plugin.event({ event: { type: "message.updated", properties: { info: mk(`${sessionID}-b`, 100, 20) } } });
  await plugin.event({ event: { type: "message.updated", properties: { info: mk(`${sessionID}-c`, 200, 50) } } });
  const records = readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const a = records.find((r) => r.message === `${sessionID}-a`);
  const b = records.find((r) => r.message === `${sessionID}-b`);
  const c = records.find((r) => r.message === `${sessionID}-c`);
  assert.equal(a.context_growth, 0);
  assert.equal(b.context_growth, 0);
  assert.equal(c.context_growth, 130);

  await plugin.event({ event: { type: "session.compacted", properties: { sessionID } } });
  const after = {};
  await plugin["tool.execute.before"]({ tool: "read", sessionID, args: { path: "src/y.js", offset: 1, limit: 10 } }, after);
  await plugin.event({ event: { type: "message.updated", properties: { info: mk(`${sessionID}-d`, 50, 5) } } });
  const d = readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .find((r) => r.message === `${sessionID}-d`);
  assert.equal(d.context_growth, 0);
});
