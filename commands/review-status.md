# Review Status

Read the canonical Organic RDD receipt and current candidate freshness.

Input: `$ARGUMENTS`

Rules:

- Require a review ID and use `review_status`.
- Report lifecycle status, tier, missing lenses, verification status, gate status, and freshness.
- If stale, say that a new review must be started for the current bytes.
- Do not infer approval from feature-local markdown.
