# Review Capture

Capture one required reviewer lens result for a frozen Organic RDD candidate.

Input: `$ARGUMENTS`

Expected input:

- Review ID
- Lens: `code-review`, `verifier`, `security-review`, or `architecture-review`
- Status: `pass`, `fail`, or `blocked`
- Concise summary and optional evidence

Rules:

- Use `review_capture` only after the named review was actually performed.
- Never record `pass` without concrete reviewer evidence.
- Do not capture a lens that the receipt does not require.
- A repeated capture intentionally replaces the prior result for that lens.
