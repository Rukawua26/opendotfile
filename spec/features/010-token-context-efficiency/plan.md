# Plan — Feature 010

## A. Configuration

Edit four files; add `preserve_recent_tokens` and lower `tail_turns`:

| file | tail_turns | preserve_recent_tokens |
|---|---:|---:|
| `opencode.jsonc` | 4 | 24000 |
| `profiles/work/opencode.jsonc` | 4 | 24000 |
| `profiles/personal/opencode.jsonc` | 3 | 16000 |
| `profiles/light/opencode.jsonc` | 2 | 8000 |

Keep `auto: true`, `prune: true`, `tool_output` unchanged, models unchanged.

## B. Policy docs

Append to `~/AGENTS.md`:
- Anti-re-read rule.
- Delegation threshold (1–3 direct, >5 → explore).
- Effort mapping (low/medium/max).
- Long-session thresholds (20/50/100 tools).

Update `~/opencode-custom/skills/token-efficient-control/SKILL.md` with the
same thresholds so the skill and the global rules agree.

## C. Re-read guardrail

New `lib/tool-efficiency.js`:
- `readSignature(input)` → `{path, offset, limit}` normalised string.
- `createReadHistory()` → Map of signature → count, capped at 200 entries.
- `noteRead(history, input)` → returns new count (1, 2, 3, …).
- `clearReads(history)` → wipe all reads for the session.
- `clearAll(history)` → full reset (used by apply_patch and compact).

Modify `plugins/guardrails.js`:
- Import `tool-efficiency.js`.
- Per-session read history inside the existing state object.
- `tool.execute.before` for `read`/`Read`: call `noteRead`; on count 2 queue a
  soft warning, on count 3+ queue a stronger warning. Only one warning per
  count tier per signature to avoid spam.
- `tool.execute.before` for `edit`/`write`/`apply_patch`: `clearAll` so the
  next reads of changed files are not flagged.
- Add 50-tool and 100-tool total warnings alongside the existing 20-tool one.
- `session.compacted` and `session.deleted` already reset state; ensure the
  read history is cleared too.

Never mutate `output.output`, never throw, never block.

## D. Metrics v2

`lib/session-metrics.js`:
- Add `schema_version: 2` to every record.
- Add `tools_delta` (computed from the metricState delta already produced).
- Add `duplicate_reads` (from a duplicate-read counter in session state).
- Add `context_tokens` = `input + cache_read`.
- Add `context_growth` = `context_tokens - prevContextTokens` for the session.

`plugins/session-metrics.js`:
- Add `duplicate_reads` counter to session state, incremented when guardrail
  flags a duplicate (received via metadata on `tool.execute.after`).
- Track `prevContextTokens` per session for `context_growth`.
- Pass counters into `metricFromMessage`.

`tools/opencode-metrics.js`:
- Split records by `schema_version`. Tool/loop/duplicate totals computed only
  from v2 records. Report `legacy_records` count. Token totals still use all
  records (tokens are reliable across the whole history).

## E. Tests

- Extend `tests/guardrails.test.js`: second identical read → soft warning;
  third → stronger; different range → no warning; after edit → reset.
- Extend `tests/session-metrics.test.js` and `tests/session-metrics-plugin.test.js`:
  v2 fields present; `context_growth` computed; `duplicate_reads` counted.
- Extend `tests/opencode-metrics.test.js`: legacy vs v2 split; tool totals only
  from v2; `legacy_records` reported.
- All existing tests must still pass.

## F. Organic RDD

Tier 3 (runtime plugins + metrics + guardrails). Freeze the changed files and
run the receipt through the configured lenses + verifier before syncing to
`~/.config/opencode/`.

## G. Deploy

1. Implement in `~/opendotfile`.
2. `node --test tests/*.test.js`.
3. Organic RDD approve.
4. Sync approved files to `~/.config/opencode/`.
5. `opencode debug config`.
6. Commit + push.
7. Do not run auto-backup before approval.

## H. Measure

Run `node tools/opencode-metrics.js 3 --stdout` after 3 days and compare with
the pre-change baseline (47.4M input / 7 days / 86.8% cache hit).
