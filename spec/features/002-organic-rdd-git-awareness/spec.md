# Spec: Organic RDD Git Awareness

## Summary

Add Git-aware manifest diagnostics to Organic RDD without changing the MVP trust boundary or installing hooks.

## Goals

- Record Git metadata in new receipts when the project is a Git repository.
- Warn when `review_start` receives an explicit file manifest that omits currently changed Git files.
- Add an optional strict gate mode that fails when changed files are outside the receipt manifest.
- Document the explicit-files limitation and strict gate option.

## Non-Goals

- No automatic hook installation.
- No replacement of `explicit-files` projection.
- No cryptographic authentication against same-user filesystem tampering.
- No automatic broad workspace scan outside Git metadata.

## Functional Requirements

- FR-1: `review_start` stores `git.root`, `git.head`, `git.changed_files`, and `git.untracked_files` when available.
- FR-2: `review_start` stores `manifest_warnings` when Git changed files are not included in `candidate_files`.
- FR-3: `review_status` exposes manifest warnings and whether the manifest is complete against current Git status.
- FR-4: `review_gate` accepts `strict_manifest`; when true, changed files outside the manifest produce `decision=fail`.
- FR-5: Non-Git projects continue to work with `git.available=false` and no strict manifest block.
- FR-6: Git deletions are reported as `manifest_has_deletions`; strict `explicit-files` gates fail for deletions because deleted bytes cannot be hashed by this projection.

## Acceptance Criteria

- AC-1: A Git repo with all changed files listed has no incomplete-manifest warning.
- AC-2: A Git repo with an omitted changed file records a warning at start and status.
- AC-3: Normal gate remains backward-compatible and does not block solely for extra Git changes.
- AC-4: Strict gate fails when Git changed files are outside the manifest.
- AC-5: Non-Git projects still create and gate receipts.
- AC-6: Renames and nested workspaces compare against the candidate's usable path names and do not produce false incomplete-manifest warnings.
