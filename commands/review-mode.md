# Review Mode

Read or change the Organic RDD kill switch.

Input: `$ARGUMENTS`

Rules:

- With no argument, use `review_mode_get`.
- With `managed` or `disabled`, use `review_mode_set`.
- Reject other values.
- Explain that `disabled` defers to repository policy and never fabricates approval.
- Explain that receipts created unmanaged need a new managed review before approval.
