#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const HOME = process.env.HOME || "/tmp";
const DATA_DIR = join(HOME, ".local/share/opencode/plugins-data");
const file = process.env.OPENCODE_METRICS_FILE || join(DATA_DIR, "session-metrics.jsonl");
const summaryFile = process.env.OPENCODE_METRICS_SUMMARY_FILE || join(DATA_DIR, "metrics-summary.json");
const args = process.argv.slice(2);
const printToStdout = args.includes("--stdout");
const daysArg = args.find((arg) => /^\d+$/.test(arg));
const days = Math.max(1, Number(daysArg || 30));
const cutoff = Date.now() - days * 86400000;

const summary = {
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
  broad_reads: 0,
  verified_messages: 0,
  loop_detected_messages: 0,
  failures: 0,
  effort_modes: {},
  models: {},
};

const records = existsSync(file)
  ? readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((item) => Date.parse(item.timestamp) >= cutoff)
  : [];

summary.messages = records.length;
summary.sessions = new Set(records.map((item) => item.session)).size;

for (const item of records) {
  summary.cost += item.cost || 0;
  summary.input_tokens += item.tokens?.input || 0;
  summary.output_tokens += item.tokens?.output || 0;
  summary.reasoning_tokens += item.tokens?.reasoning || 0;
  summary.cache_read_tokens += item.tokens?.cache_read || 0;
  summary.tools += item.tools || 0;
  summary.delegations += item.delegations || 0;
  summary.compactions += item.compactions || 0;
  summary.broad_reads += item.reads_broad || 0;
  if (item.verified) summary.verified_messages += 1;
  if (item.loop_detected) summary.loop_detected_messages += 1;
  const effort = item.effort_mode || "unset";
  summary.effort_modes[effort] = (summary.effort_modes[effort] || 0) + 1;
  summary.failures += item.failed ? 1 : 0;

  const key = `${item.provider}/${item.model}`;
  summary.models[key] ||= { messages: 0, cost: 0, input_tokens: 0, output_tokens: 0 };
  summary.models[key].messages += 1;
  summary.models[key].cost += item.cost || 0;
  summary.models[key].input_tokens += item.tokens?.input || 0;
  summary.models[key].output_tokens += item.tokens?.output || 0;
}

const serialized = `${JSON.stringify(summary, null, 2)}\n`;
mkdirSync(dirname(summaryFile), { recursive: true, mode: 0o700 });
writeFileSync(summaryFile, serialized, { mode: 0o600 });

if (printToStdout) process.stdout.write(serialized);
