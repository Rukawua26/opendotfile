# Feature 010 — Token Context Efficiency

## Problem

Session metrics over 7 days (3,950 messages, 256 sessions) show the system
sends 47.4M fresh input tokens (86.8% cache hit) against 1.1M output tokens.
The cache utilization is excellent, but the per-message input is large:

- Agent `build`: avg 12,455 input tokens/message, 2,134 messages.
- Agent `plan`: avg 28,747 input tokens/message.
- Top 10 outliers: 280K–330K input tokens for 150–200 output tokens.
- 456 loop warnings over the dataset (partially inflated by legacy metrics).
- One session accumulated 19,177 tools before compaction.

The current `tail_turns` (6 central/work, 4 personal, 3 light) keeps too many
verbatim tool responses after compaction, and there is no guardrail against
re-reading an identical file range that is already in context.

## Scope

Reduce the fresh input tokens sent to models by 20–35% without losing quality,
security, or the SDD/RDD workflow. This is an efficiency pass, not a model swap
and not a behaviour change.

## Goals

1. Tighten `compaction.tail_turns` and add `preserve_recent_tokens` across all
   profiles so less verbatim context survives compaction.
2. Add an advisory re-read guardrail that warns (never blocks) when the same
   file range is read repeatedly, and when edit/write/apply_patch happens so
   the read history is reset.
3. Add progressive session warnings at 50 and 100 tools (the 20-tool warning
   already exists).
4. Upgrade session metrics to `schema_version: 2` with `tools_delta`,
   `duplicate_reads`, `context_tokens` and `context_growth`, so future analysis
   uses reliable per-message deltas instead of the mixed legacy accumulator.
5. Update `tools/opencode-metrics.js` so summaries treat legacy records and
   v2 records separately for tool/loop/duplicate stats.

## Non-Goals

- No automatic `/compact` from plugins.
- No blocking of tools.
- No model changes.
- No changes to Organic RDD, SDD, git gate, profiles, or `local-model-router`.
- No Colibrí integration.

## Acceptance Criteria

- `tail_turns` is 4/4/3/2 and `preserve_recent_tokens` is 24k/24k/16k/8k for
  central+work / central+work / personal / light respectively.
- `opencode debug config` exits 0 after the change.
- A second identical `read` of the same path+offset+limit produces a soft
  warning; a third produces a stronger warning; a different range does not.
- After `edit`, `write`, or `apply_patch`, the read history for that session is
  reset so the next read of the now-changed file is not flagged.
- After `session.compacted` or `session.deleted`, guardrail and metrics state
  for that session is cleared.
- Guardrails never set `output.output` to empty and never throw.
- Metrics records emitted after the change include `schema_version: 2`,
  `tools_delta`, `duplicate_reads`, `context_tokens`, and `context_growth`.
  Legacy records without those fields still parse in summaries.
- `opencode-metrics.js` reports tool/loop/duplicate stats computed only from
  `schema_version: 2` records, and reports a `legacy_records` count.
- `node --test tests/*.test.js` passes with the new and existing tests.
- The Organic RDD receipt for this candidate is approved before sync.

## Risks

- Lower `tail_turns` could drop a turn the agent needs, causing a re-read.
  Mitigation: `preserve_recent_tokens` keeps a token budget; rollback is one
  config edit.
- The re-read guard could fire on legitimate re-reads after external changes.
  Mitigation: edit/write/apply_patch reset the history; warnings are advisory.
- Metrics v2 could break consumers of the JSONL. Mitigation: new fields are
  additive; `opencode-metrics.js` is updated to handle both schemas.
