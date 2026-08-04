# Tasks — Feature 010

## A. Configuration
- [ ] A1 Edit `opencode.jsonc`: tail_turns 4, preserve_recent_tokens 24000.
- [ ] A2 Edit `profiles/work/opencode.jsonc`: tail_turns 4, preserve_recent_tokens 24000.
- [ ] A3 Edit `profiles/personal/opencode.jsonc`: tail_turns 3, preserve_recent_tokens 16000 (currently 4).
- [ ] A4 Edit `profiles/light/opencode.jsonc`: tail_turns 2, preserve_recent_tokens 8000 (currently 3).
- [ ] A5 `opencode debug config` passes.

## B. Policy
- [ ] B1 Append anti-re-read + delegation + effort + long-session rules to `~/AGENTS.md`.
- [ ] B2 Mirror thresholds in `token-efficient-control/SKILL.md`.
- [ ] B3 Add copy of updated `~/AGENTS.md` into the repo (backup script already drags it).

## C. Re-read guardrail
- [ ] C1 Create `lib/tool-efficiency.js` with read signatures + history helpers.
- [ ] C2 Extend `plugins/guardrails.js`: per-session read history, soft/strong warnings, edit/write/apply_patch reset, 50/100 tool warnings.
- [ ] C3 Add tests in `tests/guardrails.test.js`.

## D. Metrics v2
- [ ] D1 Extend `lib/session-metrics.js` with schema_version + new fields.
- [ ] D2 Extend `plugins/session-metrics.js` to track duplicate_reads + prevContextTokens.
- [ ] D3 Extend `tools/opencode-metrics.js` to split legacy vs v2.
- [ ] D4 Extend metrics tests.

## E. Validation
- [ ] E1 `node --test tests/*.test.js` green.
- [ ] E2 `opencode debug config` exit 0.

## F. RDD
- [ ] F1 `review_start` with the candidate files.
- [ ] F2 Capture required lenses + verify.
- [ ] F3 `review_finalize` → approved.

## G. Deploy
- [ ] G1 Sync approved files to `~/.config/opencode/`.
- [ ] G2 Commit + push.
- [ ] G3 `opencode debug config` exit 0 after sync.
