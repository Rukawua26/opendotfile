# Plan: Organic RDD Project Identity And Read-Only Validator

## Approach

Add a `resolveProjectRoot` function that walks up from the workspace path to find a Git root or `.sdd-project` marker. Use it in `review_start` to set `project_path`, `workspace_path`, and `project_id`. Add `review_validate` that reuses existing validation helpers but never touches `saveReceipt`.

## Changes

1. Add `resolveProjectRoot(workspacePath)` returning `{ projectPath, workspacePath, projectId, gitAvailable }` in `lib/organic-rdd.js`.
2. Update `inspectCandidate` to use the resolved project root for containment checks.
3. Update `start` to record `workspace_path`, `project_id`, and resolve Git root correctly.
4. Add `validate(reviewID, projectPath)` that returns the diagnostic object.
5. Add `review_validate` tool to plugin with `allow` permission.
6. Add `review_validate` command.
7. Add `review_validate` permission to all profile configs.
8. Add tests for root resolution, containment, validate, and read-only guarantees.
9. Run full suite, syntax checks, diff check, and config validation.

## Design Decisions

- Use Git top-level as the strongest signal. Falls back to `.sdd-project` marker for non-Git projects.
- `project_id` is sha256 of the resolved `project_path` string.
- `review_validate` reuses `validateReceipt` for integrity but wraps in try/catch and never persists.
- `review_status` remains as-is for compatibility.
- Permission default `allow` because no state is mutated.

## Testing Strategy

- Git repo workspace: `project_path` equals `git rev-parse --show-toplevel`.
- Subdirectory workspace: resolves to repo root.
- Non-Git workspace with `.sdd-project`: resolves to marker directory.
- Path outside project rejected.
- `review_validate` on a valid receipt returns all pass.
- `review_validate` on a stale receipt returns `candidate_freshness: stale`.
- `review_validate` does not change receipt mtime.
- `review_validate` on unknown ID returns `receipt_integrity: not_found`.

## Verification

- `node --test tests/*.test.js`
- `node --check lib/organic-rdd.js && node --check plugins/organic-rdd.js`
- `git diff --check`
- `opencode debug config`
- `diff lib/organic-rdd.js ~/.config/opencode/lib/organic-rdd.js`
