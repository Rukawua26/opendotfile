# Review Capture

Capture one required reviewer lens result, or an optional `refuter` result, for a frozen Organic RDD candidate.

Input: `$ARGUMENTS`

Expected input:

- Review ID
- Lens: `code-review`, `verifier`, `security-review`, or `architecture-review`; `refuter` is optional and never required by default
- Status: `pass`, `fail`, or `blocked`
- Concise summary and optional evidence; include `reviewer_id`, `execution_id`, and structured findings when available

Rules:

- Use `review_capture` only after the named review was actually performed.
- Never record `pass` without concrete reviewer evidence.
- Do not capture an unknown lens; `refuter` is the only lens allowed when not required.
- A repeated capture intentionally replaces the prior result for that lens.
