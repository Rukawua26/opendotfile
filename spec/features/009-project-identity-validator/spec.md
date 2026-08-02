# Spec: Organic RDD Project Identity And Read-Only Validator

## Summary

Two tightly coupled changes: (1) resolve the effective project root correctly so receipts are not created against a parent directory like `/home/miguel`, and (2) add a strictly read-only validator operation that can diagnose receipts without mutating state.

## Problem

### Project Identity Is Incorrect

`review_start` currently uses `ctx.directory` directly as `project_path`. When OpenCode is launched from `/home/miguel` but operates on `/home/miguel/opencode-config-backup`, the receipt records:

```text
project_path: /home/miguel
candidate files: opencode-config-backup/lib/organic-rdd.js
git.available: false
```

This causes:

- False project mismatch for legitimate candidate paths.
- Git awareness is silently disabled.
- Cross-repository boundaries are not enforced.
- Kill switch per project will map to the wrong project.
- Stale candidate bytes cannot be detected reliably because the workspace is wrong.

### Validation Is Not Separable From Mutation

`review_status` and `review_gate` both mutate the receipt: `review_gate` writes `gate_status` and can reclassify status; `review_status` does not mutate, but there is no single operation that returns a complete diagnostic without any side effects. This makes it impossible to audit receipts from scripts, editors, or CI without risking state changes.

## Goals

1. Resolve the effective project root when the workspace is inside a Git repository or an SDD project.
2. Record both `workspace_path` and `project_path` distinctly in new receipts.
3. Add `project_id` as a deterministic identifier for the project.
4. Add `review_validate` operation that never mutates the store.
5. Preserve backward compatibility with receipts that only have legacy `project_path`.
6. Allow `review_validate` to be configured as `allow` because it cannot mutate state.
7. Do not remove or change existing `review_start`, `review_status`, or `review_gate` behavior.

## Non-Goals

- Do not install or activate Git hooks yet.
- Do not change the projection from `explicit-files` to Git-aware yet.
- Do not migrate or rewrite existing receipts.
- Do not add cross-project lineage.
- Do not add cryptographic binding.
- Do not remove the current mutable `review_gate`.

## Scope

### In Scope

- New `resolveProjectRoot` function in `lib/organic-rdd.js`.
- New `project_id` and `workspace_path` fields in receipts.
- New `review_validate` function and tool.
- New `review_validate` command.
- New permission `review_validate` (default `allow`).
- Tests for root resolution, nested workspaces, invalid workspaces, and read-only guarantees.

### Out Of Scope

- Git-aware projection (`git-worktree-v1`).
- Kill switch per project.
- Bounded corrections.
- Hooks installation.

## Functional Requirements

### FR-1 Project Root Resolution

`review_start` must resolve the effective project root:

- **Priority 1:** Git top-level directory containing the workspace path.
- **Priority 2:** Nearest ancestor containing `.sdd-project` marker file (opt-in project hint).
- **Priority 3:** The workspace path itself when neither of the above applies.

### FR-2 Receipt Fields

New receipts must include:

- `workspace_path`: the original `ctx.directory`.
- `project_path`: the resolved project root.
- `project_id`: `sha256(project_path)`.

Legacy receipts without `project_id` remain valid and are treated as having `legacy_project_binding`.

### FR-3 Parent Project Containment

Any candidate file path must resolve inside `project_path`. A path that resolves above or outside the project root must be rejected with code `project_mismatch`.

### FR-4 review_validate Operation

`review_validate` returns a diagnostic object:

```text
receipt_integrity: pass | fail | not_found
candidate_freshness: pass | blocked | stale
lineage_integrity: pass | blocked | parent_unverified
policy_compatibility: pass | outdated | unknown
project_binding: pass | blocked | legacy
git_projection: complete | incomplete | unavailable
required_action: none | start_new_review | start_successor | resolve_lineage
recommendation: human-readable
```

`review_validate` never:

- Writes files.
- Creates directories.
- Acquires locks.
- Modifies `revision`, `status`, `gate_status`, or timestamps.
- Calls `prepareStore`, `loadReceipt` with persistence, or `saveReceipt`.

### FR-5 Permission

`review_validate` is configured as `allow` in all profiles because it is strictly read-only.

Existing tools (`review_start`, `review_capture`, `review_finalize`, `review_gate`) remain `ask`.

## Acceptance Criteria

### AC-1 Root Resolution

A workspace inside `/home/miguel/opencode-config-backup` resolves `project_path` to `/home/miguel/opencode-config-backup`. `project_id` is deterministic.

### AC-2 Git Availability

The resolved project contains `.git`, and `git.available=true` with correct `git.root`.

### AC-3 Nested Workspace Rejection

A candidate containing a path outside `project_path` is rejected with code `project_mismatch`.

### AC-4 Validate Returns All Fields

`review_validate` returns all seven diagnostic fields plus a recommendation.

### AC-5 Read-Only Guarantee

Calling `review_validate` produces no filesystem writes outside the system temp directory. Receipt mtime is unchanged.

### AC-6 Backward Compatibility

A receipt without `project_id` continues to load and is marked `project_binding: legacy`.

### AC-7 Invalid Workspace

When `ctx.directory` resolves above any candidate file (e.g., `/home/miguel`), `review_start` must still fail because no relevant project can be determined without a Git repo or marker.

## Constraints

- Node.js standard library only.
- No project marker files are created.
- `project_id` is sha256 of the canonical project path.
- Legacy receipts are never rewritten.
- `review_validate` must pass syntax and mutation tests.
