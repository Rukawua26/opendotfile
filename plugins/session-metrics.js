import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { metricFromMessage } from "../lib/session-metrics.js";

const HOME = process.env.HOME || "/tmp";
const DATA_DIR = join(HOME, ".local/share/opencode/plugins-data");
const LOG_FILE = join(DATA_DIR, "session-metrics.jsonl");
const sessions = new Map();
const recorded = new Set();
const broadPatterns = [/^\*{2,}$/, /^\*\*\//, /^\*\./, /^src\//, /^packages\//, /^app\//, /^lib\//, /^test/];
const loopThreshold = 10;

function stateFor(sessionID) {
  if (!sessions.has(sessionID)) sessions.set(sessionID, { tools: 0, delegations: 0, compactions: 0, reads_broad: 0, effort_mode: null, verified: false, loop_detected: false, lastTool: null, sameToolCount: 0 });
  return sessions.get(sessionID);
}

function appendMetric(metric) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    if (!existsSync(LOG_FILE)) writeFileSync(LOG_FILE, "", { mode: 0o600 });
    appendFileSync(LOG_FILE, `${JSON.stringify(metric)}\n`);
  } catch {
    // Metrics must never interrupt the coding session.
  }
}

export const sessionMetricsPlugin = async () => ({
  "tool.execute.before": async (input) => {
    const state = stateFor(input.sessionID);
    state.tools += 1;
    if (input.tool === "task") state.delegations += 1;
    if (input.tool === "Read") {
      const path = String(input.args?.path || "");
      if (broadPatterns.some((p) => p.test(path))) state.reads_broad += 1;
    }
    if (input.tool === state.lastTool) {
      state.sameToolCount += 1;
      if (state.sameToolCount >= loopThreshold) state.loop_detected = true;
    } else {
      state.sameToolCount = 0;
    }
    state.lastTool = input.tool;
  },
  event: async ({ event }) => {
    if (event.type === "session.compacted") {
      stateFor(event.properties.sessionID).compactions += 1;
      return;
    }
    if (event.type === "session.deleted") {
      sessions.delete(event.properties.sessionID);
      return;
    }
    if (event.type === "message.updated") {
      const info = event.properties.info;
      if (recorded.has(info.id)) return;
      const state = stateFor(event.properties.sessionID);
      if (info.role === "user" && typeof info.text === "string") {
        const effortMatch = info.text.match(/\/effort\s+(low|medium|max)/);
        if (effortMatch) state.effort_mode = effortMatch[1];
        if (info.text.includes("execute-verified") || info.text.includes("/verify")) state.verified = true;
      }
      const metric = metricFromMessage(info, state);
      if (!metric) return;
      recorded.add(info.id);
      appendMetric(metric);
    }
  },
});

export default sessionMetricsPlugin;
