const WARN_CONSECUTIVE = 5;
const WARN_TOTAL = 20;
const WARN_FAILURES = 3;
const MAX_WARNING_HISTORY = 10;

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
      failures: 0,
      lastFailTool: null,
      emptyWarned: false,
      pendingWarnings: new Map(),
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

      if (input.tool === st.lastTool) {
        st.consecutive++;
      } else {
        st.consecutive = 1;
        st.lastTool = input.tool;
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
        if (input.tool === st.lastFailTool) {
          st.failures++;
        } else {
          st.failures = 1;
          st.lastFailTool = input.tool;
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
