# Spec: Organic RDD Hardening

## Summary

Close candidate-identity and risk-classification bypasses found during the Organic RDD audit without changing the public tool or receipt contracts.

## Scope

- Reject symbolic links from explicit candidate manifests.
- Classify nested `AGENTS.md` and project-local `.opencode` guidance/configuration conservatively.
- Classify common source-code extensions as Tier 3 runtime.
- Verify that every shipped profile loads Organic RDD and requires confirmation for mutating and gate tools.

## Non-Goals

- No Git projection replacing `explicit-files`.
- No mandatory Git hooks.
- No new receipt schema version.
- No expansion of the same-user trust boundary.

## Acceptance Criteria

- AC-1: Internal and external candidate symlinks are rejected with a stable error code.
- AC-2: Nested `AGENTS.md` and `.opencode/agent(s)/**` are at least Tier 2.
- AC-3: `.opencode/command(s)/**`, `.opencode/skill(s)/**`, and prompts are at least Tier 1.
- AC-4: Common runtime extensions, including JSX, TSX, Python, Go, Rust, Java, Kotlin, Ruby, PHP, C/C++, and shell, are Tier 3 outside tests.
- AC-5: Test source files remain Tier 2 rather than requiring all Tier 3 lenses.
- AC-6: Main, work, personal, and light configs load `organic-rdd.js`; reads are `allow` and mutations/gate are `ask`.
- AC-7: Existing Organic RDD and repository tests continue to pass.
