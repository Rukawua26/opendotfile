# Plan: Lifecycle Hooks

## Approach

Dos capas como Organic RDD:
- `lib/hooks.js`: core engine puro, sin dependencia de OpenCode. Parsea reglas, hace matching, spawns procesos, evalua exit codes.
- `plugins/hooks.js`: adaptador que se conecta a `tool.execute.before/after` y `session.*` de OpenCode.

La config vive en `opencode.jsonc` bajo key `hooks[]`. El plugin la lee al iniciar.

## Archivos a crear

- `lib/hooks.js` (~100 lines) - core engine
- `plugins/hooks.js` (~60 lines) - OpenCode adapter
- `tests/hooks.test.js` (~150 lines) - core engine tests
- `tests/hooks-plugin.test.js` (~100 lines) - plugin integration tests

## Archivos a modificar

- `opencode.jsonc` - agregar `hooks[]` array y registrar plugin
- `install.sh` - agregar hooks.js a la copia si es necesario (ya copia `plugins/` y `lib/`)

## Testing strategy

- Core engine tests: unit tests con scripts mock, timeout, exit codes, matching
- Plugin tests: verificar que el plugin se conecta a `tool.execute.before/after` y ejecuta reglas
- Verificar convivencia con `guardrails.js`

## Riesgos y dependencias

- Dependencia: OpenCode plugin API hooks `tool.execute.before/after`
- Riesgo: scripts hooks lentos - mitigado con timeout default 5s y fail-open
- Riesgo: colision con guardrails.js - mitigado porque OpenCode encadena multiples plugins
