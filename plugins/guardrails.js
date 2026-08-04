import { readSignature, createReadHistory, noteRead, readWarning, clearReads } from "../lib/tool-efficiency.js";

const WARN_CONSECUTIVE = 5;
const WARN_TOTAL = 20;
const WARN_TOTAL_50 = 50;
const WARN_TOTAL_100 = 100;
const WARN_FAILURES = 3;
const MAX_WARNING_HISTORY = 10;
const READ_TOOLS = new Set(["read"]);
const RESET_TOOLS = new Set(["edit", "write", "apply_patch", "patch"]);

const sessionState = new Map();

function getState(sessionID) {
  const sid = sessionID || 'default';
  if (!sessionState.has(sid)) {
    sessionState.set(sid, {
      lastTool: null,
      consecutive: 0,
      consecutiveWarned: false,
      total: 0,
      totalWarned: false,
      total50Warned: false,
      total100Warned: false,
      failures: 0,
      lastFailTool: null,
      emptyWarned: false,
      pendingWarnings: new Map(),
      readHistory: createReadHistory(),
    });
  }
  return sessionState.get(sid);
}

function addWarnings(output, warnings) {
  if (!warnings.length) return;
  output.metadata = {
    ...output.metadata,
    guardrail_triggered: warnings[warnings.length - 1].trigger,
    guardrail_warning: warnings[warnings.length - 1].warning,
    guardrail_warnings: [
      ...(Array.isArray(output.metadata?.guardrail_warnings) ? output.metadata.guardrail_warnings : []),
      ...warnings,
    ].slice(-MAX_WARNING_HISTORY),
  };
}

function queueWarning(state, callID, warning) {
  const key = callID || "__legacy__";
  const warnings = state.pendingWarnings.get(key) || [];
  if (warnings.length < MAX_WARNING_HISTORY) warnings.push(warning);
  state.pendingWarnings.set(key, warnings);
}

function resetState(sessionID) {
  const sid = sessionID || 'default';
  sessionState.delete(sid);
}

export const guardrailsPlugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const st = getState(input.sessionID);
      st.total++;
      if (st.total === WARN_TOTAL && !st.totalWarned) {
        st.totalWarned = true;
        queueWarning(st, input.callID, {
          trigger: "total_calls",
          warning: `[GUARDRAIL: ${st.total} tools usadas en esta sesión. Considera si puedes simplificar.]`,
        });
      }

      if (st.total === WARN_TOTAL_50 && !st.total50Warned) {
        st.total50Warned = true;
        queueWarning(st, input.callID, {
          trigger: "total_calls_50",
          warning: `[GUARDRAIL: ${st.total} tools usadas en esta sesión. Considera compactar o subdividir la tarea.]`,
        });
      }

      if (st.total === WARN_TOTAL_100 && !st.total100Warned) {
        st.total100Warned = true;
        queueWarning(st, input.callID, {
          trigger: "total_calls_100",
          warning: `[GUARDRAIL: ${st.total} tools usadas en esta sesión. Divide la tarea en sesiones más cortas.]`,
        });
      }

      const toolName = String(input.tool || "").toLowerCase();
      if (READ_TOOLS.has(toolName)) {
        const signature = readSignature(input);
        const count = noteRead(st.readHistory, signature);
        const warning = readWarning(st.readHistory, signature, count);
        if (warning) queueWarning(st, input.callID, warning);
      }

      if (RESET_TOOLS.has(toolName)) {
        clearReads(st.readHistory);
      }

      if (toolName === st.lastTool) {
        st.consecutive++;
      } else {
        st.consecutive = 1;
        st.lastTool = toolName;
        st.consecutiveWarned = false;
      }

      if (st.consecutive >= WARN_CONSECUTIVE && !st.consecutiveWarned) {
        st.consecutiveWarned = true;
        queueWarning(st, input.callID, {
          trigger: "consecutive_tools",
          warning: `[GUARDRAIL: Llamaste a "${input.tool}" ${st.consecutive} veces seguidas. Si no está funcionando, considera cambiar de enfoque o herramienta.]`,
        });
      }
    },

    "tool.execute.after": async (input, output) => {
      const st = getState(input.sessionID);
      const callID = input.callID || "__legacy__";
      const warnings = st.pendingWarnings.get(callID) || [];
      st.pendingWarnings.delete(callID);

      const outText = output?.output || '';
      if (!outText || outText.trim().length < 5) {
        const toolName = String(input.tool || "").toLowerCase();
        if (toolName === st.lastFailTool) {
          st.failures++;
        } else {
          st.failures = 1;
          st.lastFailTool = toolName;
        }

        if (st.failures >= WARN_FAILURES && !st.emptyWarned) {
          st.emptyWarned = true;
          warnings.push({
            trigger: "empty_output",
            warning: `[GUARDRAIL: "${input.tool}" devolvió resultado vacío ${st.failures} veces. Prueba otra estrategia.]`,
          });
          st.failures = 0;
        }
      } else {
        st.failures = 0;
        st.emptyWarned = false;
      }

      addWarnings(output, warnings);
    },

    event: async ({ event }) => {
      if (event.type === "session.compacted" || event.type === "session.deleted") {
        const sessionID = event.properties.sessionID || event.properties.info?.id;
        if (sessionID) resetState(sessionID);
      }
    },
  };
};

export default guardrailsPlugin;
