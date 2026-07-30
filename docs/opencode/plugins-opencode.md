---
titulo: "Plugins OpenCode"
tipo: opencode
categoria: plugins
tags: [opencode, plugins, config, status/active, area/config]
relacionado: "[[OpenCode System]], [[OpenCode Config]]"
ultima-actualizacion: 2026-07-13
---
# Plugins OpenCode

## Resumen
5 plugins esenciales se cargan automaticamente. Los plugins opcionales se
mantienen fuera del directorio auto-cargado y solo se activan por perfil.

| Plugin | Archivo | Función | Tools/Hooks |
|--------|---------|---------|-------------|
| personalities.js | `plugins-optional/personalities.js` | Personalidades bajo demanda | `set_personality` |
| guardrails.js | `plugins/guardrails.js` | Anti-loop y detección de errores | Hook automático |
| checkpoints.js | `plugins/checkpoints.js` | Snapshots automáticos antes de edit/write | Hook automático |
| kanban.js | `plugins-optional/kanban.js` | Tablero de tareas bajo demanda | `kanban_create`, `kanban_list`, `kanban_update`, `kanban_delete` |
| sandbox.js | `plugins-optional/sandbox.js` | Ejecución aislada en Docker | `sandbox_exec` |
| validator.js | `plugins/validator.js` | Validación de API keys al inicio | Hook startup |
| organic-rdd.js | `plugins/organic-rdd.js` | Review por riesgo con receipts globales y gate manual | `review_mode_get`, `review_mode_set`, `review_start`, `review_status`, `review_capture`, `review_verify`, `review_finalize`, `review_gate` |
| auto-memory.js | `plugins-optional/auto-memory.js` | Candidatos de memoria solo en work | `auto_memory_capture`, `auto_memory_summary` |

## Almacenamiento
| Datos | Ubicación | Formato |
|-------|-----------|---------|
| Facts usuario/proyecto | `~/.local/share/opencode/plugins-data/memory.json` | JSON |
| Engramas | `~/.local/share/opencode/plugins-data/memory.db` | SQLite + FTS5 |
| Sesiones | Tabla `sessions` dentro de `memory.db` | SQLite |

## Integración
- `opencode.jsonc` → registra los 5 plugins esenciales
- Inyectan en `chat.system.transform` al inicio de sesión

## Ver también
- [[OpenCode System]]
- [[Agentes OpenCode]]
- [[MCP Servers OpenCode]]
