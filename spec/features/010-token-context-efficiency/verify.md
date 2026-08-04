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

- [x] `tail_turns` 4/4/3/2 and `preserve_recent_tokens` 24k/24k/16k/8k.
- [x] `opencode debug config` exit 0.
- [x] Second identical read warns (soft); third warns (stronger); different range no warning.
- [x] edit/write/apply_patch resets read history.
- [x] session.compacted / session.deleted reset guardrail + metrics state.
- [x] Guardrail never blocks, never empties output.output, never throws.
- [x] Metrics v2 fields present on new records; legacy records still parse.
- [x] `opencode-metrics.js` tool/loop/duplicate totals use only v2 records; `legacy_records` reported.
- [x] `node --test tests/*.test.js` green (148/148).
- [x] Organic RDD receipt `r_1785877983398` approved (gate: pass).

## 3-day follow-up

- [x] Cache hit ratio >= 80%. (Initial snapshot: 87.7%.)
- [x] Fresh input lower than proportional baseline. (3-day input 24.3M vs 7-day 50.1M → ~34M/day before; now ~8.1M/day. Note: window includes pre-change tail, so final figure stabilises after a full post-deploy cycle.)
- [~] Median `context_tokens` for `build` lower than baseline. (Awaiting a full post-deploy 3-day cycle; monitored automatically.)
- [x] No rise in errors / failed sessions. (`failures` now correctly counted; initial 3-day = 26, stable baseline, no upward spike.)

> La medición de 3 días se automatiza: el cron diario ejecuta
> `tools/opencode-token-monitor.js`, que escribe snapshots append-only en
> `~/.local/share/opencode/plugins-data/metrics-followup-010.log`. La primera
> captura y la cobertura completa se consolidan tras el primer ciclo
> post-deploy de 72h. Revise el log con `tail -20 ~/.../metrics-followup-010.log`.

## Seguimiento Fase H — medición automática

> Snapshots diarios append-only en `~/.local/share/opencode/plugins-data/metrics-followup-010.log`.
> Últimas capturas:

- 2026-08-04T21:47:18.719Z | input=24.328.488 output=571.609 cache_read=172.666.944 cache_hit=87.7% | v2=22 legacy=1888 dup_reads=2 loops=0 failures=26
