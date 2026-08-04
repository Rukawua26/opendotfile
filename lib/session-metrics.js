import { createHash } from "node:crypto";

function shortID(sessionID) {
  return createHash("sha256").update(sessionID || "unknown").digest("hex").slice(0, 12);
}

export function metricFromMessage(info, state = {}) {
  if (!info || info.role !== "assistant" || !info.time?.completed) return null;
  const inputTokens = Number(info.tokens?.input || 0);
  const cacheRead = Number(info.tokens?.cache?.read || 0);
  return {
    schema_version: 2,
    timestamp: new Date(info.time.completed).toISOString(),
    session: shortID(info.sessionID),
    message: info.id,
    agent: info.agent || info.mode || "unknown",
    provider: info.providerID || "unknown",
    model: info.modelID || "unknown",
    duration_ms: Math.max(0, info.time.completed - info.time.created),
    cost: Number(info.cost || 0),
    tokens: {
      input: inputTokens,
      output: Number(info.tokens?.output || 0),
      reasoning: Number(info.tokens?.reasoning || 0),
      cache_read: cacheRead,
      cache_write: Number(info.tokens?.cache?.write || 0),
    },
    context_tokens: inputTokens + cacheRead,
    context_growth: Number(state.context_growth || 0),
    tools: Number(state.tools || 0),
    tools_delta: Number(state.tools || 0),
    delegations: Number(state.delegations || 0),
    compactions: Number(state.compactions || 0),
    reads_broad: Number(state.reads_broad || 0),
    duplicate_reads: Number(state.duplicate_reads || 0),
    effort_mode: state.effort_mode || null,
    verified: state.verified || false,
    loop_detected: state.loop_detected || false,
    failed: Boolean(info.error),
  };
}
