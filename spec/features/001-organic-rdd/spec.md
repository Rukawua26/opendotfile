# Spec: Organic RDD For OpenCode

## Summary

Add a lightweight Organic Review-Driven Development layer on top of the existing SDD workflow. The system must keep trivial changes fast, require evidence for riskier changes, persist review state globally, and never represent bypassed work as approved.

Organic RDD complements `spec -> plan -> tasks -> implement -> verify`; it does not replace it.

## Problem

The repository has SDD phases, reviewer roles, verification loops, and guardrails, but most enforcement is instructional. Sensitive changes can therefore depend on convention rather than durable state and explicit evidence.

## Goals

- Classify change risk consistently and explain the classification.
- Keep documentation-only changes ceremony-free.
- Require stronger review and verification for configuration and runtime changes.
- Bind review evidence to a reproducible candidate identity.
- Persist canonical review state outside the working tree.
- Provide a manual gate that can later be reused by Git hooks.
- Preserve a real kill switch whose disabled state means unmanaged, never approved.
- Require human confirmation for Organic RDD mutation and gate tools; model instructions alone are not an authorization boundary.

## Non-Goals

- No HTTP service, remote control plane, or multi-user workflow.
- No mandatory Git hooks in the MVP.
- No automatic reviewer execution at gate time.
- No external database or PR platform integration.
- No replacement of existing SDD commands.

## Scope

### In Scope

- Global state under `~/.local/share/opencode/plugins-data/organic-rdd/`.
- Review modes `managed` and `disabled`.
- Four risk tiers.
- Content-bound candidate identities.
- Durable review receipts and lifecycle validation.
- Manual review and gate tools and commands.
- Verification evidence integration.

### Out Of Scope

- Git hook installation or enforcement.
- Commit-aware or worktree-aware candidate projections.
- Networked or shared receipt storage.
- Automatic invocation of reviewer agents.

## Risk Tiers

### Tier 0: Informational

Examples: documentation, notes, canvases, and other non-operational content.

Policy: no lenses and no verification requirement; the gate may pass immediately.

### Tier 1: Guidance

Examples: `skills/**/SKILL.md`, `commands/*.md`, prompts, and workflow documentation.

Policy: `code-review` and verification are required.

### Tier 2: Configuration

Examples: `AGENTS.md`, `opencode.jsonc`, profiles, MCP configuration, agents, and support configuration.

Policy: `code-review`, `verifier`, and verification are required.

### Tier 3: Runtime Or Control

Examples: behavior-changing plugins, model routing, permissions, persistence, gates, sandboxing, and security-sensitive operational logic.

Policy: `code-review`, `verifier`, `security-review`, `architecture-review`, and verification are required. Tier 3 is conservatively security-sensitive regardless of filename.

The highest matching tier governs the complete candidate. Classification must return its reasons.

## Review Mode

### Managed

Classification, required lenses, verification, and gate decisions are enforced.

### Disabled

Organic RDD defers to ordinary repository policy. Review and gate do not block, but results must be `unmanaged` or `skipped`. Disabled mode must never create or imply approval. Re-enabling review does not convert old unmanaged receipts into approvals.

## Lifecycle

- `reviewing`: candidate, tier, and required lenses are frozen.
- `validating`: all required lenses passed; verification is pending.
- `approved`: all required lenses passed and verification passed.
- `blocked`: a required lens failed, evidence is missing at finalization, verification failed, or candidate bytes changed.
- `unmanaged`: the receipt was created while review mode was disabled. Disabling later produces a transient unmanaged result without destroying an existing managed receipt.

Every transition is bound to the frozen `candidate_id`. A receipt whose current files no longer produce the same candidate identity is stale and cannot be approved or pass a managed gate.

## Canonical Receipt

Each receipt must contain at least:

- `schema_version`
- `review_id`
- `feature_id`
- `project_path`
- `project_name`
- `status`
- `review_mode`
- `tier`
- `tier_reasons`
- `candidate_id`
- `candidate_files` with relative path and content hash
- `required_lenses`
- `captured_lenses`
- `verify_status`
- `verify_evidence`
- `gate_status`
- `created_at`
- `updated_at`

The global receipt is canonical. Feature-local `verify.md` stores only a reference and human-readable evidence.

## Functional Requirements

### FR-1 Review Mode

Expose tools to read and set `managed` or `disabled`. A missing mode defaults to `managed`. An unreadable or invalid mode file must fail closed as `managed` and report the anomaly.

### FR-2 Review Start

Accept a project path, feature identity, and explicit relevant file list. Validate that files belong to the project, classify risk, hash the current bytes, determine lenses, and create a receipt atomically.

The OpenCode adapter binds `project_path` to the active workspace and exposes the projection as `explicit-files`. Human confirmation of `review_start` is the MVP completeness check for that manifest.

### FR-3 Review Status

Return state, tier, reasons, missing or failed lenses, verification state, gate readiness, and candidate freshness.

### FR-4 Review Capture

Record one result per required lens, bound to the receipt candidate. Reject unknown lenses and stale candidates. A repeated lens capture replaces the prior result explicitly rather than creating ambiguity.

A passing lens requires a non-empty summary and concrete evidence.

### FR-5 Verification Evidence

Expose a tool to record `pass`, `fail`, or `blocked` verification plus evidence. Reject stale candidates.

Passing verification requires concrete non-empty evidence.

### FR-6 Review Finalize

Set `approved` only for a fresh managed candidate whose required lenses all passed and whose verification passed. Otherwise set `blocked`. While mode is disabled, return an unmanaged result without mutating an existing managed receipt.

### FR-7 Review Gate

Validate an existing receipt without launching reviewers. Managed fresh Tier 0 receipts pass immediately. Other managed receipts pass only when approved. Disabled mode returns skipped/unmanaged without approval.

### FR-8 Storage Safety

Create private storage directories/files and use atomic replacement for mode and receipt writes.

Receipts must be strictly validated on read. Concurrent updates must use revision compare-and-swap so older operations cannot overwrite newer evidence.

## Acceptance Criteria

### AC-1 Tier 0 Fast Path

A docs-only candidate is Tier 0, requires no lenses or verification, and passes the managed gate.

### AC-2 Tier 1 Review

A skill or command markdown candidate is Tier 1 and requires `code-review` plus verification.

### AC-3 Tier 2 Review And Verify

An `AGENTS.md` or `opencode.jsonc` candidate is Tier 2 and requires `code-review`, `verifier`, and verification.

### AC-4 Tier 3 Strong Control

A behavior-changing plugin candidate is Tier 3 and requires `code-review`, `verifier`, verification, and relevant security or architecture lenses.

### AC-5 Disabled Means Unmanaged

Disabled mode never creates an approved receipt or approved gate result.

### AC-6 Finalize Requires Passing Evidence

Missing or failed required lenses, missing or failed verification, or a stale candidate prevents approval.

### AC-7 Canonical Global State

Status and gate decisions derive from the global receipt; local markdown is informational only.

### AC-8 Safe Persistence

Corrupt mode state fails closed as managed, invalid receipt input is rejected, and writes do not leave partially written JSON.

## Constraints

- Use Node.js standard library only.
- Keep commands as UX wrappers; business logic belongs to the plugin/core module.
- Do not load broad unrelated project context.
- Preserve current SDD behavior for projects that do not use Organic RDD.

## Trust Boundary

- Organic RDD protects the normal OpenCode tool workflow through `ask` permissions and strict receipts.
- The local operating-system user and arbitrary same-user processes remain trusted in the MVP; receipts are not cryptographically authenticated against their owner.
- Direct same-user filesystem tampering is reported as a residual trust assumption, not treated as a multi-user security boundary.
