# Verify — Feature 010

## Baseline (pre-change)

- 3,950 messages / 7 days.
- 47.4M fresh input, 1.1M output, 312.0M cache_read.
- Cache hit ratio: 86.8%.
- Agent `build` avg input: 12,455.
- Agent `plan` avg input: 28,747.
- Top outlier: 330,741 input for 158 output.
- `tail_turns`: 6/6/4/3 (central/work/personal/light).

## Post-change acceptance

- [ ] `tail_turns` 4/4/3/2 and `preserve_recent_tokens` 24k/24k/16k/8k.
- [ ] `opencode debug config` exit 0.
- [ ] Second identical read warns (soft); third warns (stronger); different range no warning.
- [ ] edit/write/apply_patch resets read history.
- [ ] session.compacted / session.deleted reset guardrail + metrics state.
- [ ] Guardrail never blocks, never empties output.output, never throws.
- [ ] Metrics v2 fields present on new records; legacy records still parse.
- [ ] `opencode-metrics.js` tool/loop/duplicate totals use only v2 records; `legacy_records` reported.
- [ ] `node --test tests/*.test.js` green.
- [ ] Organic RDD receipt approved before sync.

## 3-day follow-up

- [ ] Median `context_tokens` for `build` lower than baseline.
- [ ] Fresh input total lower than proportional baseline.
- [ ] Cache hit ratio >= 80%.
- [ ] No rise in errors or failed sessions.
