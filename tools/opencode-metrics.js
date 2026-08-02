#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const HOME = process.env.HOME || "/tmp";
const file = process.env.OPENCODE_METRICS_FILE
  || join(HOME, ".local/share/opencode/plugins-data/session-metrics.jsonl");
const stdoutMode = process.argv.includes("--stdout");
const numericArg = process.argv.slice(2).find((arg) => !arg.startsWith("--") && !Number.isNaN(Number(arg)));
const days = Math.max(1, Number(numericArg || 30));
const cutoff = Date.now() - days * 86400000;
const summaryFile = process.env.OPENCODE_METRICS_SUMMARY_FILE
  || join(HOME, ".local/share/opencode/plugins-data", `metrics-summary-${days}d.json`);

if (!existsSync(file)) {
  if (stdoutMode) {
    console.log(JSON.stringify({
      days,
      messages: 0,
      sessions: 0,
      cost: 0,
      input_tokens: 0,
      output_tokens: 0,
      reasoning_tokens: 0,
      cache_read_tokens: 0,
      tools: 0,
      delegations: 0,
      compactions: 0,
      failures: 0,
      models: {},
    }, null, 2));
  } else {
    console.log("No session metrics recorded yet.");
  }
  process.exit(0);
}

const records = readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((item) => Date.parse(item.timestamp) >= cutoff);

const summary = {
  days,
  messages: records.length,
  sessions: new Set(records.map((item) => item.session)).size,
  cost: 0,
  input_tokens: 0,
  output_tokens: 0,
  reasoning_tokens: 0,
  cache_read_tokens: 0,
  tools: 0,
  delegations: 0,
  compactions: 0,
  failures: 0,
  models: {},
};

for (const item of records) {
  summary.cost += item.cost || 0;
  summary.input_tokens += item.tokens?.input || 0;
  summary.output_tokens += item.tokens?.output || 0;
  summary.reasoning_tokens += item.tokens?.reasoning || 0;
  summary.cache_read_tokens += item.tokens?.cache_read || 0;
  summary.tools += item.tools || 0;
  summary.delegations += item.delegations || 0;
  summary.compactions += item.compactions || 0;
  summary.failures += item.failed ? 1 : 0;
  const key = `${item.provider}/${item.model}`;
  summary.models[key] ||= { messages: 0, cost: 0, input_tokens: 0, output_tokens: 0 };
  summary.models[key].messages += 1;
  summary.models[key].cost += item.cost || 0;
  summary.models[key].input_tokens += item.tokens?.input || 0;
  summary.models[key].output_tokens += item.tokens?.output || 0;
}

const payload = JSON.stringify(summary, null, 2);

if (stdoutMode) {
  console.log(payload);
} else {
  try {
    mkdirSync(dirname(summaryFile), { recursive: true });
    writeFileSync(summaryFile, `${payload}\n`);
  } catch {
    // Summary persistence must never interrupt the session.
  }
}
