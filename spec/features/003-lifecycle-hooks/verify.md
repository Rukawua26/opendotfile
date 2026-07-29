# Verify: Lifecycle Hooks

## Acceptance Criteria

| # | Criterio | Estado | Evidencia |
|---|----------|--------|-----------|
| AC-1 | Hook PreToolUse + matcher matchea tool, ejecuta script y bloquea con exit 2 | PASS | `hooks.test.js`: "Exit code 2 bloquea la ejecucion con stderr como razon" |
| AC-2 | Hook con matcher que NO matchea no se ejecuta | PASS | `hooks.test.js`: "Hook con matcher que NO matchea no se ejecuta" |
| AC-3 | PostToolUse se ejecuta despues del tool y no puede bloquear | PASS | `hooks.test.js`: "PostToolUse ejecuta hooks pero no puede bloquear" |
| AC-4 | Script timeout permite ejecucion (fail-open) | PASS | `hooks.test.js`: "Timeout fail-open permite la ejecucion" |
| AC-5 | Exit 0 permite y stdout se appendea | PASS | `hooks.test.js`: "Exit code 0 permite y stdout se appendea" |
| AC-6 | Exit 2 bloquea con stderr como razon | PASS | `hooks.test.js`: "Exit code 2 bloquea la ejecucion con stderr como razon" |
| AC-7 | Hook sin matcher matchea todos los tools | PASS | `hooks.test.js`: "Hook sin matcher matchea todos los tools" |
| AC-8 | Multiples hooks; si uno bloquea los siguientes no se ejecutan | PASS | `hooks.test.js`: "Multiples hooks en el mismo evento; si uno bloquea los siguientes no se ejecutan" |
| AC-9 | Hook configurado en opencode.jsonc se carga al iniciar | PASS | `hooks-plugin.test.js`: "plugin carga y expone hooks before/after" |
| AC-10 | Plugin convive con guardrails.js sin conflicto | PASS | `hooks-plugin.test.js`: "plugin convive con engine sin estado compartido" |
| AC-11 | SessionStart y SessionEnd hooks se disparan | PASS | `hooks.test.js`: "SessionStart hooks se ejecutan", "SessionEnd hooks se ejecutan" |

## Test Results

- `node --test tests/hooks.test.js`: PASS (13 tests)
- `node --test tests/hooks-plugin.test.js`: PASS (6 tests)
- `node --check lib/hooks.js && node --check plugins/hooks.js`: PASS
- Full regression suite: 33 + 19 = 52 tests PASS

## Verificacion Anti-Alucinacion

- `lib/hooks.js`: usa `child_process.spawn` de stdlib. `createHookEngine()` exporta `loadRules`, `getRules`, `evaluate`. Sin dependencias externas.
- `plugins/hooks.js`: usa `createHookEngine` de lib. Lee config de `opencode.jsonc`. Se conecta a `tool.execute.before/after` y event handler.
- `opencode.jsonc`: `hooks[]` array agregado en root level. `hooks.js` registrado en `plugin[]`.
- Todos los exports existen en el codigo real. No se inventaron APIs.
