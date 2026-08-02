# Spec: Organic RDD Evidence And Lineage

## Summary

Extend Organic RDD receipts with optional lineage, policy snapshots, structured findings, and reviewer identity while preserving full backward compatibility with schema version 1 receipts.

## Problem

The MVP receipts certify that a candidate was reviewed, but they cannot express:

- A correction chain linking a blocked receipt to its successor.
- Which classifier policy produced the tier and required lenses.
- Structured findings with stable fingerprints that survive lens replacement.
- Which agent role executed a lens, so auditability remains instructional only.

Without lineage, every correction starts an unrelated review and loses the connection to the original finding. Without a policy snapshot, future classifier changes can invalidate existing receipts. Without findings, a blocked lens cannot tell the next review what to fix.

## Goals

- Add optional lineage fields: `parent_review_id`, `root_review_id`, `attempt`.
- Add a `policy_snapshot` capturing the classifier version and rule sources.
- Add structured `findings` with stable fingerprints per lens.
- Add optional `reviewer_id` and `execution_id` to captured lenses.
- Preserve all existing v1 receipts and tool contracts.
- Keep classification deterministic and unchanged for existing paths.

## Non-Goals

- No new receipt schema version; this remains schema v1 with optional fields.
- No cryptographic authentication of reviewer identity.
- No automatic reviewer execution.
- No bounded-correction workflow; that is a future feature.
- No replacement of existing lens capture semantics.
- No changes to the four profile permission matrices.

## Scope

### In Scope

- Optional receipt fields populated when provided.
- Lineage chain validation: parent must exist and belong to the same project.
- Policy snapshot recorded at `review_start`.
- Findings append and resolve per lens.
- Reviewer identity recorded as informational metadata.

### Out Of Scope

- Mandatory lineage or findings.
- Cross-project lineage.
- Signed receipts.
- Automatic finding deduplication beyond stable fingerprints.
- Severities, owners, or SLAs.

## Functional Requirements

### FR-1 Lineage At Start

`review_start` accepts optional `parent_review_id` and `attempt`. When provided:

- `parent_review_id` must reference an existing receipt in the same project.
- `attempt` defaults to `parent.attempt + 1` when omitted; starts at 1 when no parent.
- `root_review_id` is the parent's `root_review_id` when a parent exists, otherwise equals the new `review_id`.

### FR-2 Policy Snapshot

`review_start` records a `policy_snapshot` containing:

- `classifier_version`: a stable version string for the classifier rules.
- `reasons`: the classification reasons already computed.

Receipts without `policy_snapshot` remain valid; readers treat missing snapshots as `unknown`.

### FR-3 Findings

`review_capture` accepts optional `findings`: an array of objects with:

- `finding_id`: stable identifier.
- `fingerprint`: short hash of lens + path + summary.
- `kind`: `blocker` or `advisory`.
- `path`: candidate-relative path or empty.
- `line_start`, `line_end`: optional integers.
- `summary`: short text.
- `status`: `open`, `resolved`, or `accepted-risk`.

A `blocker` finding with `status=open` blocks finalization. `accepted-risk` requires a non-empty rationale in the summary. Findings are stored per lens; a repeated capture replaces the findings for that lens.

### FR-4 Reviewer Identity

`review_capture` accepts optional `reviewer_id` and `execution_id` stored with the captured lens result. They are informational only and do not affect gate decisions.

### FR-5 Backward Compatibility

Receipts created before this feature must remain readable and gateable. Missing optional fields default to safe values:

- `parent_review_id`: `null`
- `root_review_id`: `review_id`
- `attempt`: `1`
- `policy_snapshot`: `{ classifier_version: "unknown" }`
- `findings`: `[]`
- `reviewer_id`: `null`
- `execution_id`: `null`

### FR-6 Validation

Lineage fields must be validated on read like existing fields. A receipt whose parent reference is broken on disk remains valid for its own candidate, but its lineage is reported as `parent_unverified`.

## Acceptance Criteria

### AC-1 Lineage Chain

A receipt created with a `parent_review_id` stores `parent_review_id`, `root_review_id`, and `attempt` correctly. A receipt created without a parent has `parent_review_id=null`, `root_review_id=review_id`, and `attempt=1`.

### AC-2 Policy Snapshot

Every new receipt contains a `policy_snapshot` with a non-empty `classifier_version`. Existing receipts without a snapshot are read as `unknown` and remain gateable.

### AC-3 Findings Block

A `blocker` finding with `status=open` prevents finalization. A `blocker` resolved to `resolved` or `accepted-risk` (with rationale) allows finalization if all lenses pass.

### AC-4 Reviewer Identity

Captured lenses may include `reviewer_id` and `execution_id`. They are persisted and returned by `review_status` but do not alter gate decisions.

### AC-5 Backward Compatibility

All 34 existing Organic RDD tests pass without modification. Existing receipts on disk remain readable.

### AC-6 Invalid Lineage

A `parent_review_id` referencing a non-existent receipt or a different project is rejected at `review_start` with a stable error code.

## Constraints

- Node.js standard library only.
- No schema version bump; optional fields only.
- Classifier version is a constant in `lib/organic-rdd.js`.
- Findings fingerprints use SHA-256 truncated to 16 hex characters.
- New tests do not modify existing test assertions.
