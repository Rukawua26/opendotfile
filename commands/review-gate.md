# Review Gate

Validate an existing Organic RDD receipt at a manual delivery boundary.

Input: `$ARGUMENTS`

Rules:

- Require a review ID and use `review_gate`.
- Use `strict_manifest=true` when you want the gate to fail if Git reports changed files outside the explicit manifest.
- The gate validates only; it never starts reviews or runs models.
- Report `pass`, `fail`, or `skipped` exactly as returned.
- If the reason is `manifest_incomplete`, list the omitted files and start a new review with the full candidate manifest.
- If warnings include `manifest_has_deletions`, strict `explicit-files` cannot certify that deletion; use the normal advisory gate or wait for a future Git projection.
- `skipped` while disabled means unmanaged, not approved.
- Name a next action only when the tool returns one.
