# Review Verify

Record executed verification evidence against a frozen Organic RDD candidate.

Input: `$ARGUMENTS`

Rules:

- Require a review ID, `pass|fail|blocked`, and concrete evidence.
- Use `review_verify` only after running the stated commands.
- Never convert failed or unexecuted checks into `pass`.
- Also maintain the feature-local `verify.md` when this is an SDD feature.
