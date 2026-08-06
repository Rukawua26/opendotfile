# Tasks Spec

Use the `sdd-tasks` skill to break a project-local SDD plan into atomic implementation tasks.

Input: `$ARGUMENTS`

Rules:

- Require `spec.md` and `plan.md` for the requested feature.
- Do not implement code.
- Tasks must be small, ordered, and verifiable.
- Initialize `verify.md` if missing.

Expected result:

- `spec/features/<feature>/tasks.md`
- `spec/features/<feature>/verify.md`
