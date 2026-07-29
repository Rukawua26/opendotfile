# Plan: Organic RDD For OpenCode

## Technical Approach

Implement a small testable core module plus an OpenCode plugin adapter:

- `lib/organic-rdd.js` owns classification, hashing, storage, lifecycle, and gate decisions.
- `plugins/organic-rdd.js` maps OpenCode tools to the core module.
- `commands/review-*.md` provide the user-facing workflow without duplicating logic.
- `commands/verify-spec.md` and `commands/implement-spec.md` describe integration with the existing SDD flow.

Separating the core avoids coupling correctness tests to OpenCode runtime internals while keeping one source of business logic.

## Global Store

Use `~/.local/share/opencode/plugins-data/organic-rdd/`:

```txt
organic-rdd/
  mode.json
  reviews/
    <review_id>.json
```

Directories use mode `0700`; files use `0600`. JSON is written to a same-directory temporary file and atomically renamed. Receipts carry `projection: explicit-files` and a monotonically increasing `revision`; updates hold a per-receipt inter-process lock across compare-and-swap and replacement.

## Candidate Identity

For each normalized project-relative file:

1. Resolve and verify containment under `project_path`.
2. Read the bytes.
3. Calculate SHA-256 for the file.
4. Sort records by relative POSIX path.
5. Calculate `candidate_id = sha256(JSON.stringify(records))`.

This makes identity deterministic and content-bound. The receipt stores records, not file contents.

## Classification

Classification is deterministic and highest-tier-wins.

- Tier 3: executable plugin/MCP/lib code, routing, permissions, security, persistence, sandbox, gates, or enforcement.
- Tier 2: central config, agents, profiles, MCP config/docs, package manifests, and operational shell/config files.
- Tier 1: skills, commands, prompts, and workflow guidance.
- Tier 0: remaining documentation and informational artifacts.

Tier 3 always adds both `security-review` and `architecture-review`; path names are not sufficient evidence that runtime code is security-insensitive.

## Lifecycle And Invariants

- `review_start` creates `reviewing`, `approved` for managed Tier 0, or `unmanaged` when disabled.
- Passing all lenses moves status to `validating` unless verification already passed.
- Any failed lens or failed/blocked verification sets `blocked`.
- `review_finalize` recalculates candidate identity before deciding.
- Only a fresh managed receipt with all passing evidence can become `approved`.
- `review_gate` recalculates candidate identity and never starts or captures review work.
- Disabled receipts and gates remain `unmanaged`/`skipped`.

## Tool Surface

- `review_mode_get`
- `review_mode_set`
- `review_start`
- `review_status`
- `review_capture`
- `review_verify`
- `review_finalize`
- `review_gate`

Tool outputs are JSON strings with stable fields suitable for people and automation. Errors include a code and message; suggested next actions are only included when they can resolve the block.

The adapter binds projects to `ctx.directory`, limits file count/size and evidence lengths, and requires non-empty evidence for passing results. Config permissions set state-changing tools and the delivery gate to `ask`; only mode and status reads are automatic.

## Existing File Changes

- Register `./plugins/organic-rdd.js` in `opencode.jsonc`.
- Register Organic RDD in work, personal, and light profiles because each profile owns an explicit plugin list.
- Add human-confirmation permissions for start, mode changes, capture, verification, finalize, and gate in the main config and every profile.
- Add six `commands/review-*.md` files plus `review-verify.md`.
- Update `commands/verify-spec.md` to record verification through `review_verify` when a receipt is active.
- Update `commands/implement-spec.md` to start review after a candidate exists for managed work.
- Update `AGENTS.md` with the concise policy and invariants.
- Update `install.sh` so specs are restored to `~/opencode-custom/spec`, matching the backup script's canonical source.
- Add focused Node tests in `tests/organic-rdd.test.js`.

## Verification Strategy

Use Node's built-in test runner with temporary stores and projects. Cover:

- Tier 0 through Tier 3 classification and lens selection.
- Deterministic hashes and stale candidate detection.
- Lifecycle success and failure paths.
- Disabled mode and corrupt mode fail-closed behavior.
- Path traversal and files outside the project.
- Atomic JSON persistence behavior observable through valid reads.
- Plugin/config syntax and existing full test suite.

## Risks And Mitigations

- Overclassification: expose reasons and keep the classifier table small.
- State divergence: global receipt is the only canonical state.
- Stale approval: recalculate candidate identity at status/finalize/gate.
- Corrupt bypass switch: invalid mode fails closed as managed.
- Command drift: commands contain no classification or transition logic.
- Hook friction: no automatic hooks in MVP.
- Same-user tampering: explicitly outside the MVP integrity boundary; OpenCode mutation tools still require human confirmation.

## Exit Criteria

- All acceptance criteria have automated or direct evidence.
- Existing tests and focused tests pass.
- Independent reviewer reports no critical or high blockers.
- `verify.md` records commands, evidence, anti-hallucination checks, and reality-check result.
