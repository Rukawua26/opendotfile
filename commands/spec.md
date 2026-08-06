# Spec

Use the `sdd-specify` skill to create or update a project-local SDD specification.

Input: `$ARGUMENTS`

Rules:

- Work only in `./spec/` relative to the current project root.
- Do not create or use `__HOME__/spec/`.
- Do not implement code.
- If the project root is unclear, ask one short clarification question.
- Create `spec/constitution/` only if missing, with non-invented placeholders where needed.
- Create the next numbered feature folder under `spec/features/` unless the user names an existing feature.

Expected result:

- `spec/features/NNN-feature-name/spec.md`
- Clear acceptance criteria
- Open questions if information is missing
