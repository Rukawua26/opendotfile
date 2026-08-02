# Verify: Organic RDD Hardening

## Status

PASS

## Evidence

- `node --test tests/organic-rdd.test.js tests/organic-rdd-plugin.test.js tests/profile-config.test.js` - 37/37 passed.
- `node --check lib/organic-rdd.js && node --check plugins/organic-rdd.js` - passed.
- `git diff --check` - passed.
- Focused symlink regressions: `rejects files outside the project and all candidate symlinks`, `rejects internal symlinks before they can hide risk or be retargeted` - PASS.
- Classification regressions: `runtime code outside known control directories remains Tier 3`, `classifies nested OpenCode control files conservatively`, `classifies common executable source as Tier 3 except tests` - PASS.
- Profile permission regression: `todos los perfiles protegen y cargan Organic RDD` - PASS.

## Acceptance Criteria

- AC-1: internal and external candidate symlinks rejected - PASS via `file_symlink` error code tests.
- AC-2: nested `AGENTS.md` and `.opencode/agent(s)/**` at least Tier 2 - PASS via `classifies nested OpenCode control files conservatively`.
- AC-3: `.opencode/command(s)/**`, `.opencode/skill(s)/**`, and prompts at least Tier 1 - PASS via same test.
- AC-4: common runtime extensions (JSX, TSX, Python, Go, Rust, Java, Kotlin, Ruby, PHP, C/C++, shell) are Tier 3 outside tests - PASS via `classifies common executable source as Tier 3 except tests`.
- AC-5: test source files remain Tier 2 - PASS via same test (`tests/view.test.tsx` and `test/server_test.py` at Tier 2).
- AC-6: main, work, personal, and light configs load `organic-rdd.js`; reads `allow`, mutations/gate `ask` - PASS via `todos los perfiles protegen y cargan Organic RDD`.
- AC-7: existing Organic RDD and repository tests continue to pass - PASS via 37/37 focused tests and 85/85 full suite.
