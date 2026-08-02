# Verify: Organic RDD Project Identity And Read-Only Validator (Feature 009)

## Status

ACCEPTED against spec.

## Verification Run

- Workspace: `/home/miguel/opencode-config-backup`
- Synced active config: `~/.config/opencode/`
- Commands:
  - `node --check lib/organic-rdd.js && node --check plugins/organic-rdd.js` -> SYNTAX OK
  - `node --test tests/*.test.js` -> tests 125, pass 125, fail 0
  - `npm run` n/a (no package.json scripts)
  - `opencode debug config` -> config loads, permissions parse, `review_validate` present in `permission` block

## Acceptance Criteria

### AC-1 Root Resolution (PASS)

A workspace inside a Git repo resolves `project_path` to the Git top-level.

Evidence (live, from `plugins/organic-rdd.js` via `review_start`):

- Input: `ctx.directory = <home>/opencode-config-backup/src`
- Files: `["../lib/organic-rdd.js"]`
- Result:
  - `workspace_path = <home>/opencode-config-backup/src`
  - `project_path = <home>/opencode-config-backup` (Git root)
  - `git_root = <home>/opencode-config-backup`
  - `project_id = sha256("<home>/opencode-config-backup")`
  - `candidate_files = [{ path: "lib/organic-rdd.js", ... }]` (relative to project_path)
- Test: `Git root is resolved via repository top-level` -> PASS

### AC-2 Git Availability (PASS)

The resolved project contains `.git`; `git.available=true` with `git.root` matching `project_path`.

Evidence: same run as AC-1 shows `git.available = true` and `git.root = git_root = project_path`.
- Test: `Git root is resolved via repository top-level` -> PASS
- Test: `project_id is deterministic and stable across subdirectories` -> PASS

### AC-3 Nested Workspace Rejection (PASS)

A candidate path resolving outside `project_path` is rejected with code `project_mismatch`.

Evidence:
- Input: `ctx.directory = <home>/repo/sub`, files `["../../outside.ts"]`
- Result: `{ ok: false, error: { code: "project_mismatch", message: "..." } }`
- Test: `candidate file outside resolved project is rejected` -> PASS
- Test: `rejects files outside the project and all candidate symlinks` -> PASS
- Test: `rejects internal symlinks before they can hide risk or be retargeted` -> PASS

### AC-4 Validate Returns All Fields (PASS)

`review_validate` returns the seven diagnostic fields plus a recommendation.

Evidence (live run):
```json
{
  "review_id": "r_1785671879184_3eff60cf-...",
  "receipt_integrity": "pass",
  "candidate_freshness": "pass",
  "lineage_integrity": "pass",
  "policy_compatibility": "pass",
  "project_binding": "pass",
  "git_projection": "unavailable",
  "required_action": "none",
  "recommendation": "Receipt is valid; no action required."
}
```
- Tests: `validate returns healthy receipt diagnostics`, `validate reports stale candidate`, `validate reports policy compatibility`, `validate detects blocked lineage from missing parent`, `validate detects lineage mismatch` -> PASS

### AC-5 Read-Only Guarantee (PASS)

`review_validate` produces no filesystem writes; receipt mtime and content unchanged.

Evidence (live run):
- `mtime unchanged: true`
- `content unchanged: true`
- `before mtime === after mtime: 1785671893483.965`
- Test: `validate is imported for read-only` -> PASS

### AC-6 Backward Compatibility (PASS)

A receipt without `project_id` continues to load and is marked `project_binding: legacy`.

Evidence: deleted `project_id`, `git_root`, `workspace_path` from a stored receipt; `review_validate` returns:
- `receipt_integrity: pass`
- `project_binding: legacy` (even when `ctx.directory` is passed by the plugin)
- Test: `receipts without project_id are marked legacy by validate` -> PASS

### AC-7 Invalid Workspace (PASS)

The workspace fallback remains valid for ordinary non-Git projects, but it cannot absorb files that belong to a nested Git or SDD project. `inspectCandidate` detects the nearest marker for each candidate and returns `project_mismatch` when a broad unmarked workspace crosses that boundary.

Evidence:
- Input: unmarked parent workspace containing `nested-repo/.git`, candidate `nested-repo/src/app.ts`.
- Result: `OrganicRddError` with `code = "project_mismatch"`.
- Test: `broad workspace cannot absorb a nested Git project` -> PASS.

## Plugin / Tool Surface

- `plugins/organic-rdd.js` (workspace backup and `~/.config/opencode/`) exposes:
  `review_mode_get, review_mode_set, review_start, review_status, review_capture, review_verify, review_finalize, review_validate, review_gate`
- Test: `plugin exposes the negotiated tool surface and structured results` -> PASS (9 tools including `review_validate`)

## Permissions

- `permission.review_validate = "allow"` added to:
  - `opencode.jsonc` (workspace backup and `~/.config/opencode/`)
  - `profiles/work/opencode.jsonc`
  - `profiles/personal/opencode.jsonc`
  - `profiles/light/opencode.jsonc`
- `opencode debug config` parses successfully.

## Files Touched

- `lib/organic-rdd.js`
  - `projectId` exported
  - `findSddProjectMarker` and `resolveProjectRoot` added
  - `inspectCandidate` uses `resolveProjectRoot`; preserves `workspace_path` and `project_path`
  - `start` records `workspace_path`, `git_root`, `project_id` (`sha256(project_path)`)
  - `validate(reviewID, projectPath)` read-only function added
  - `assertReceiptProject` accepts git-root equivalence
  - Legacy freshness and lineage derive effective identity without rewriting receipts
  - New receipts validate `project_id`, `workspace_path`, and `git_root` coherence
  - Nested Git/SDD boundaries are enforced for marked and unmarked parent workspaces
- `plugins/organic-rdd.js` -> `review_validate` tool added
- `commands/review-validate.md` -> read-only diagnostic command added
- `opencode.jsonc` + profiles -> `review_validate: "allow"`
- `tests/organic-rdd.test.js` -> tests for validate, resolveProjectRoot, git_root, project_id; existing nested-workspace tests updated to FR-2 contract (paths relative to git root)
- `tests/organic-rdd-plugin.test.js` -> `review_validate` expected

## Sync State

- `cp /home/miguel/opencode-config-backup/lib/organic-rdd.js ~/.config/opencode/lib/organic-rdd.js` -> done
- `cp tests/organic-rdd.test.js ~/.config/opencode/tests/organic-rdd.test.js` -> done
- `cp tests/organic-rdd-plugin.test.js ~/.config/opencode/tests/organic-rdd-plugin.test.js` -> done
- `cp plugins/organic-rdd.js ~/.config/opencode/plugins/organic-rdd.js` -> done (via edit)
- `node --test tests/*.test.js` in `~/.config/opencode/` -> 125 pass, 0 fail

## Independent Review Remediation

The first Tier 3 review round failed and the candidate was not approved. The following findings were corrected before the final review:

- Nested workspaces now resolve through `resolveProjectRoot` in `review_validate`, so the creating workspace binds successfully.
- `project_id` must be a 64-character SHA-256 equal to `sha256(project_path)`; `git_root` must match `project_path` when present.
- Legacy nested-Git receipts use an in-memory compatibility adapter for freshness, gate, and successor lineage; receipt bytes are never rewritten.
- Nested Git/SDD projects cannot be absorbed by a marked or unmarked parent project.
- Invalid `.git` markers do not become project identity when Git is available and rejects them.
- FR-3 containment failures now return `project_mismatch`.
- FR-4 not-found/invalid diagnostics use declared enum values and `git_projection` reports `incomplete` when the manifest is incomplete.
- Read-only evidence now checks both receipt content and mtime, and unknown validation does not create the store.
- `review_validate` no longer executes `git status`; Git projection is diagnosed from the frozen receipt snapshot, and tests prove `.git/index` and `index.lock` are unchanged.
- New Git receipts require `git_root === git.root === project_path`; non-Git receipts require all Git identity fields to be null.
- New receipts require a coherent stored Git snapshot; deleting `git` or changing snapshot-derived manifest warnings fails integrity validation.
- New receipts also require the `manifest_warnings` snapshot field; deleting it fails integrity validation rather than defaulting projection to complete.
- `workspace_path` preserves the original absolute `ctx.directory`, while a separate canonical path is used internally for containment and hashing.
- All backup and active profiles explicitly set `review_validate: "allow"`.

## Non-Goals Honored

- No Git hooks installed.
- No `git-worktree-v1` projection.
- No migration/rewrite of legacy receipts (AC-6 honored: legacy receipts stay read-only with `project_binding: legacy`).
- No cross-project lineage.
- No cryptographic binding beyond sha256 project_id.
- `review_gate` kept as mutating operation; `review_validate` is the new read-only path.

## Recommendation

Close Feature 009. Keep receipt migration out of scope; open a separate feature only if legacy receipt rewriting is later required.
