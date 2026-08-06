# Verify Spec

Verify a project-local SDD feature against its acceptance criteria.

Input: `$ARGUMENTS`

Rules:

- Read only the requested feature under `./spec/features/` and relevant changed files.
- Compare implementation against `spec.md` acceptance criteria.
- Run checks from `plan.md` when available.
- Use the `verification-loop` skill for full project verification when appropriate.
- Record results in `spec/features/<feature>/verify.md`.
- When an Organic RDD review ID is active, record the executed outcome with `review_verify` and add Review ID, Candidate ID, Tier, Review Status, and Gate Status to `verify.md`.
- Do not create a review automatically during verification; verification must remain bound to the candidate frozen by `review_start`.

Expected result:

- PASS/FAIL status
- Commands executed
- Criteria validated
- Remaining issues, if any
