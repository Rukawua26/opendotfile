# Plan: Organic RDD Evidence And Lineage

## Approach

Add optional fields to the receipt object without changing `schema_version`. The core library handles defaults, validation, and lineage resolution. The plugin exposes the new optional parameters without changing existing tool signatures.

## Changes

1. Add `CLASSIFIER_VERSION` constant and `policySnapshot()` helper to `lib/organic-rdd.js`.
2. Extend `review_start` to accept optional `parent_review_id` and `attempt`; resolve and validate lineage.
3. Extend `review_capture` to accept optional `findings`, `reviewer_id`, and `execution_id`.
4. Extend `validateReceipt` to validate optional lineage, policy snapshot, and findings fields with safe defaults.
5. Extend the plugin tool schemas with optional parameters.
6. Add focused tests for lineage, policy snapshot, findings, reviewer identity, and backward compatibility.
7. Run focused and full verification, syntax checks, and diff checks.

## Design Decisions

- Keep `schema_version=1` and use optional fields. This avoids receipt migration and keeps backward compatibility.
- Use a constant `CLASSIFIER_VERSION` instead of reading rule files; the rules are hardcoded in `classifyOne`.
- Findings live per lens inside `captured_lenses[].findings`; a repeated `capture` replaces the findings for that lens.
- `parent_unverified` is advisory; it does not block approval. The receipt's own candidate and lenses remain authoritative.
- `accepted-risk` requires rationale in the finding summary to prevent silent acceptance.

## Verification

- `node --test tests/organic-rdd.test.js tests/organic-rdd-plugin.test.js`
- `node --test tests/*.test.js`
- `node --check lib/organic-rdd.js && node --check plugins/organic-rdd.js`
- `git diff --check`
- `opencode debug config`
