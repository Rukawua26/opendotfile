---
description: Produce a concise session handoff that preserves decisions, evidence, and pending work across compaction or a new session.
---

# Session Handoff

Create a continuation artifact from the current session. Do not invent facts and do not include credentials, private keys, tokens, raw environment values, or long tool output.

Use this exact structure:

```markdown
## Objective
[Current user goal and approved scope]

## Decisions
- [Decision and short rationale]

## Changes
- `[path]`: [what changed]

## Verification
- `[command]`: PASS/FAIL/BLOCKED - [evidence]

## Pending
- [Concrete next action or blocker]

## Constraints
- [Project rules, invariants, compatibility or security constraints]
```

Keep it under 800 words. Prefer exact paths, symbols and commands over narrative. If no work remains, state `Pending: none`.
