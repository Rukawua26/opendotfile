# Plan Spec

Use the `sdd-plan` skill to create a technical plan for a project-local SDD feature.

Input: `$ARGUMENTS`

Rules:

- Read only the requested feature under `./spec/features/` and minimal constitution files.
- Do not implement code.
- If `spec.md` has blocking open questions, ask before planning.
- Keep the plan constrained to the acceptance criteria.

Expected result:

- `spec/features/<feature>/plan.md`
- Technical approach
- Files likely to change
- Testing strategy
- Risks and dependencies
