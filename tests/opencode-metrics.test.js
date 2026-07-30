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
