import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { metricFromMessage } from "../lib/session-metrics.js";
import { readSignature } from "../lib/tool-efficiency.js";

const HOME = process.env.HOME || "/tmp";
const DATA_DIR = join(HOME, ".local/share/opencode/plugins-data");
const LOG_FILE = process.env.OPENCODE_METRICS_FILE || join(DATA_DIR, "session-metrics.jsonl");
const sessions = new Map();
const recorded = new Set();
const broadPatterns = [/^\*{2,}$/, /^\*\*\//, /^\*\./, /\*\*/, /\/$/];
const loopThreshold = 10;
const effortModes = new Set(["low", "medium", "max"]);
const defaultEffort = effortModes.has(process.env.OPENCODE_EFFORT_MODE)
  ? process.env.OPENCODE_EFFORT_MODE
  : "medium";

function createSessionState() {
  return {
    tools: 0,
    delegations: 0,
    compactions: 0,
    reads_broad: 0,
    duplicate_reads: 0,
    readSeen: new Map(),
    prevContextTokens: undefined,
    effort_mode: defaultEffort,
    verified: false,
    loop_detected: false,
    lastTool: null,
    sameToolCount: 0,
    recorded: { tools: 0, delegations: 0, compactions: 0, reads_broad: 0, duplicate_reads: 0 },
  };
}

function stateFor(sessionID) {
  if (!sessions.has(sessionID)) sessions.set(sessionID, createSessionState());
  return sessions.get(sessionID);
}

function observeTool(state, input) {
  const toolName = String(input?.tool || "").toLowerCase();
  state.tools += 1;
  if (toolName === "task") state.delegations += 1;

  if (toolName === "read") {
    const args = input?.args || {};
    const path = String(args.path || args.filePath || args.file_path || "");
    if (broadPatterns.some((pattern) => pattern.test(path))) state.reads_broad += 1;

    const signature = readSignature(input);
    const previous = state.readSeen.get(signature) || 0;
    state.readSeen.set(signature, previous + 1);
    if (previous >= 1) state.duplicate_reads += 1;
  }

  if (toolName === state.lastTool) {
    state.sameToolCount += 1;
    if (state.sameToolCount >= loopThreshold) state.loop_detected = true;
  } else {
    state.sameToolCount = 1;
    state.lastTool = toolName;
  }
}

function metricState(state) {
  if (!state.recorded) state.recorded = { tools: 0, delegations: 0, compactions: 0, reads_broad: 0, duplicate_reads: 0 };
  const delta = {
    tools: state.tools - state.recorded.tools,
    delegations: state.delegations - state.recorded.delegations,
    compactions: state.compactions - state.recorded.compactions,
    reads_broad: state.reads_broad - state.recorded.reads_broad,
    duplicate_reads: state.duplicate_reads - state.recorded.duplicate_reads,
  };
  state.recorded = {
    tools: state.tools,
    delegations: state.delegations,
    compactions: state.compactions,
    reads_broad: state.reads_broad,
    duplicate_reads: state.duplicate_reads,
  };
  return delta;
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

const sessionMetricsPlugin = async () => ({
  "tool.execute.before": async (input) => {
    const state = stateFor(input.sessionID);
    observeTool(state, input);
  },
  event: async ({ event }) => {
    if (event.type === "session.compacted") {
      const state = stateFor(event.properties.sessionID);
      state.compactions += 1;
      state.readSeen.clear();
      state.prevContextTokens = undefined;
      return;
    }
    if (event.type === "session.deleted") {
      sessions.delete(event.properties.sessionID);
      return;
    }
     if (event.type === "message.updated") {
       const info = event.properties.info;
       if (recorded.has(info.id)) return;
       const state = stateFor(event.properties.sessionID || info.sessionID);
       if (info.role === "user" && typeof info.text === "string") {
         const effortMatch = info.text.match(/\/effort\s+(low|medium|max)/);
         if (effortMatch) state.effort_mode = effortMatch[1];
         if (info.text.includes("execute-verified") || info.text.includes("/verify")) state.verified = true;
       }
       if (info.role !== "assistant" || !info.time?.completed) return;
       const contextTokens = Number(info.tokens?.input || 0) + Number(info.tokens?.cache?.read || 0);
       if (state.prevContextTokens !== undefined) {
         state.context_growth = Math.max(0, contextTokens - state.prevContextTokens);
       } else {
         state.context_growth = 0;
       }
       state.prevContextTokens = contextTokens;
       const metric = metricFromMessage(info, { ...state, ...metricState(state) });
       state.loop_detected = false;
      if (!metric) return;
      recorded.add(info.id);
      appendMetric(metric);
    }
  },
});

export default sessionMetricsPlugin;
