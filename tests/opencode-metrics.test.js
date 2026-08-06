import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = mkdtempSync(join(tmpdir(), "opencode-metrics-test-"));
const source = join(root, "session-metrics.jsonl");
const summary = join(root, "metrics-summary.json");
const script = join(process.cwd(), "tools/opencode-metrics.js");
const record = {
  timestamp: new Date().toISOString(),
  session: "session-test",
  provider: "openai",
  model: "gpt-test",
  cost: 0.25,
  tokens: { input: 10, output: 5, reasoning: 2, cache_read: 3 },
  tools: 2,
  effort_mode: "medium",
};

writeFileSync(source, `${JSON.stringify(record)}\n`);

function run(args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPENCODE_METRICS_FILE: source, OPENCODE_METRICS_SUMMARY_FILE: summary },
  });
}

test("modo normal persiste el resumen sin imprimir JSON", () => {
  const result = run(["1"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(readFileSync(summary, "utf8")).messages, 1);
});

test("failures es un numero y se cuenta por registros fallidos", () => {
  const flog = join(root, "failures-metrics.jsonl");
  const fsummary = join(root, "failures-summary.json");
  writeFileSync(
    flog,
    `${JSON.stringify({ ...record, failed: true })}\n${JSON.stringify({ ...record, message: "msg2", failed: false })}\n`,
  );
  const res = spawnSync(process.execPath, [script, "--stdout", "1"], {
    encoding: "utf8",
    env: { ...process.env, OPENCODE_METRICS_FILE: flog, OPENCODE_METRICS_SUMMARY_FILE: fsummary },
  });
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(Number.isInteger(out.failures), true);
  assert.equal(out.failures, 1);
});

test("--stdout imprime un JSON valido bajo demanda", () => {
  const result = run(["--stdout", "1"]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.equal(output.models["openai/gpt-test"].input_tokens, 10);
  assert.equal(output.cost, 0.25);
});

test("el JSONL detallado permanece intacto", () => {
  const before = readFileSync(source, "utf8");
  run(["1"]);
  assert.equal(readFileSync(source, "utf8"), before);
});

test("separación de registros legacy vs v2 y totales solo de v2", async () => {
  const splitLog = join(root, "split-metrics.jsonl");
  const legacy = {
    timestamp: new Date().toISOString(),
    session: "s-legacy",
    provider: "openai",
    model: "gpt-legacy",
    cost: 1,
    tokens: { input: 1000, output: 10, cache_read: 0 },
    tools: 5,
    loop_detected: true,
    failed: false,
  };
  const v2 = {
    schema_version: 2,
    timestamp: new Date().toISOString(),
    session: "s-v2",
    provider: "openai",
    model: "gpt-v2",
    cost: 0.5,
    tokens: { input: 100, output: 5, cache_read: 20 },
    tools: 3,
    tools_delta: 3,
    delegations: 1,
    compactions: 0,
    duplicate_reads: 2,
    loop_detected: true,
    failed: false,
  };
  writeFileSync(splitLog, `${JSON.stringify(legacy)}\n${JSON.stringify(v2)}\n`);

  const res = spawnSync(process.execPath, [script, "--stdout", "1"], {
    encoding: "utf8",
    env: { ...process.env, OPENCODE_METRICS_FILE: splitLog },
  });
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(out.messages, 2);
  assert.equal(out.legacy_records, 1);
  assert.equal(out.v2_records, 1);
  assert.equal(out.tools, 3);
  assert.equal(out.duplicate_reads, 2);
  assert.equal(out.loop_messages, 1);
  assert.equal(out.models["openai/gpt-legacy"].messages, 1);
  assert.equal(out.models["openai/gpt-v2"].messages, 1);
});
