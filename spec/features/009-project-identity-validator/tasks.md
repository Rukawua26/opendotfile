# Tasks: Organic RDD Project Identity And Read-Only Validator

- [x] Add resolveProjectRoot function to lib/organic-rdd.js (findGitMarker / findSddProjectMarker walk-up).
- [x] inspectCandidate resolves the project root for containment while preserving workspace-relative inputs.
- [x] start records workspace_path, project_path, project_id, and git_root.
- [x] Add validate(reviewID, projectPath) read-only function.
- [x] Add review_validate tool to plugin.
- [x] Add review_validate command.
- [x] Add review_validate permission (allow) to all profile configs.
- [x] Tests for root resolution, containment, and validate.
- [x] Tests proving review_validate does not mutate state (receipt mtime unchanged).
- [x] Run full test suite, syntax checks, diff check, and config validation.
- [x] Synchronize to active config and record verification.

## Notes

- Per spec Non-Goals: legacy receipts are never rewritten (AC-6).
- workspace_path keeps ctx.directory; project_path is the resolved Git/SDD root.
- Candidate paths are accepted relative to workspace_path and stored relative to project_path.
- project_id is sha256(project_path).
- No migration step: Feature 010 would be required if v1->v2 migration is ever wanted.
