# Review Start

Create an Organic RDD receipt for the exact candidate bytes produced by the current change.

Input: `$ARGUMENTS`

Expected input:

- Feature or change identifier
- Explicit list of candidate files

Rules:

- Use `review_start`.
- The project is always the current OpenCode workspace; do not substitute another root.
- Do not scan broad directories or silently add unrelated files.
- Ask one short question if the feature identifier or file list is missing.
- Show the exact file manifest to the user for confirmation; the MVP certifies `explicit-files`, not every unlisted workspace change.
- In Git repositories, report any `manifest_warnings` returned by the receipt; these are changed Git files outside the explicit manifest.
- Report the review ID, candidate ID, tier, classification reasons, and required lenses.
- A disabled result is `unmanaged`, never approved.
