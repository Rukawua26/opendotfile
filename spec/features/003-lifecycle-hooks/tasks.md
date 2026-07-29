# Tasks: Lifecycle Hooks

## T-001: Crear lib/hooks.js core engine

Implementar `createHookEngine()` con:
- `loadRules(rules)` - carga array de reglas desde config
- `evaluate(event, context)` - evalua todas las reglas que matchean el evento
- Matching por regex contra tool name
- Spawn con `child_process.spawn`, pipe JSON por stdin
- Evaluacion de exit code: 0=allow, 2=block, otros/timeout=allow
- Timeout configurable por regla (default 5s)
- `SessionStart` y `SessionEnd` hooks

## T-002: Crear tests/hooks.test.js

Tests unitarios del core engine:
- Hook matchea tool name y se ejecuta
- Hook no matchea tool name y no se ejecuta
- Exit code 0 permite y appendea stdout
- Exit code 2 bloquea con stderr como razon
- Timeout fail-open
- Multiples hooks en mismo evento
- Hook sin matcher matchea todo
- SessionStart/SessionEnd hooks

## T-003: Crear plugins/hooks.js

Adaptador OpenCode que:
- Lee config `hooks[]` del `opencode.jsonc`
- Se suscribe a `tool.execute.before` → evalua reglas PreToolUse, bloquea si exit 2
- Se suscribe a `tool.execute.after` → evalua reglas PostToolUse (no bloquea)
- Se suscribe a `session.*` para SessionStart/SessionEnd

## T-004: Crear tests/hooks-plugin.test.js

Tests de integracion del plugin:
- Plugin carga reglas desde config
- `tool.execute.before` ejecuta hooks y puede bloquear
- `tool.execute.after` ejecuta hooks sin bloquear
- Convive con guardrails.js

## T-005: Registrar plugin en opencode.jsonc y actualizar install.sh

- Agregar `hooks[]` array y `./plugins/hooks.js` al `plugin[]` array
- Verificar que install.sh ya copia plugins/ y lib/

## T-006: Run tests, deploy, verify

- `node --test tests/hooks.test.js tests/hooks-plugin.test.js`
- Ejecutar suite completa de regresion
- `./install.sh`
- Verificar `opencode debug config` muestra el plugin
