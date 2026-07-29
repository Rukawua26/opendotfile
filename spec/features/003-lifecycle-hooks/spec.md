# Lifecycle Hooks

## Objetivo

Agregar un sistema de hooks configurables en OpenCode que ejecute scripts del usuario en eventos del ciclo de vida del agente (pre/post tool execution, inicio/fin de sesion), permitiendo seguridad proactiva, notificaciones, auditoria y automatizaciones locales.

## Usuario / Caso De Uso

- Usuario que quiere bloquear comandos peligrosos antes de que se ejecuten
- Usuario que quiere notificaciones desktop al completar tareas largas
- Usuario que quiere auditar todas las tool calls a un archivo
- Usuario que quiere automatizar git add/commit post-edit
- Usuario que quiere enviar webhooks a Slack/Discord al finalizar tareas

## Alcance

- Plugin `plugins/hooks.js` que se suscribe a `tool.execute.before` y `tool.execute.after`
- Core `lib/hooks.js` con engine de reglas: parseo, matching, spawn, evaluacion de exit codes
- Configuracion via array `hooks[]` en `opencode.jsonc`
- Eventos: `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`
- Matching por regex contra tool name
- Fail-open: errores/timeout permiten la ejecucion (exit != 2)
- Exit code 0 = allow, 2 = block (solo PreToolUse), otros = allow

## Fuera De Alcance

- No reemplaza `guardrails.js` (anti-loop sigue siendo separado)
- No incluye comandos `/hooks` en la TUI (solo config estatica)
- No incluye hooks para eventos de red o MCP
- No incluye un sistema de plugins con marketplace

## Limites De Contexto

- Leer solo: `lib/hooks.js`, `plugins/hooks.js`, `tests/hooks*.test.js`, `opencode.jsonc`, `install.sh`
- No leer: specs de features anteriores, skills no relacionados, docs de arquitectura

## Fuentes De Verdad

- Plugin API de OpenCode: hooks `tool.execute.before` y `tool.execute.after` (ver `guardrails.js`)
- `child_process.spawn` de Node.js stdlib
- `opencode.jsonc` schema para config existente

## Criterios De Aceptacion

- AC-1: Hook con `PreToolUse` + `matcher` que matchea el tool name ejecuta el script y puede bloquear con exit 2
- AC-2: Hook con `PreToolUse` + `matcher` que NO matchea no se ejecuta
- AC-3: Hook con `PostToolUse` se ejecuta despues del tool y no puede bloquear
- AC-4: Script que hace timeout (> timeout config) permite la ejecucion (fail-open)
- AC-5: Script que devuelve exit 0 permite la ejecucion y su stdout se appendea al output
- AC-6: Script que devuelve exit 2 bloquea la ejecucion y su stderr se usa como razon
- AC-7: Hook sin `matcher` matchea todos los tools
- AC-8: Multiples hooks en el mismo evento se ejecutan en orden; si uno bloquea, los siguientes no se ejecutan
- AC-9: Hook configurado en `opencode.jsonc` se carga al iniciar el plugin
- AC-10: El plugin convive con `guardrails.js` sin conflicto
- AC-11: SessionStart y SessionEnd hooks se disparan correctamente

## Riesgos

- Scripts hooks lentos pueden retrasar la ejecucion del tool: mitigado con `timeout` default 5s
- Scripts hooks buggy pueden romper la sesion: mitigado con fail-open
- Overhead de spawn en cada tool: mitigado con `matcher` selectivo

## Preguntas Abiertas

- Ninguna (diseno discutido y aprobado con el usuario)
