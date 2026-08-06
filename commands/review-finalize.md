# Review Finalize

Evaluate whether an Organic RDD receipt has enough fresh passing evidence to approve.

Input: `$ARGUMENTS`

Rules:

- Require a review ID and use `review_finalize`.
- Do not run reviewers or verification from this command.
- Report `approved`, `blocked`, or `unmanaged` exactly as returned.
- If blocked, report the missing, failed, or stale evidence.
