# Review Validate

Diagnose an Organic RDD receipt without mutating canonical state.

Input: `$ARGUMENTS`

Rules:

- Require a review ID and use `review_validate`.
- Report receipt integrity, candidate freshness, lineage integrity, policy compatibility, project binding, Git projection, required action, and recommendation.
- Never replace this read-only diagnostic with `review_gate`.
- If the project binding is `legacy`, explain that the receipt was not rewritten.
