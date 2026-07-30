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
8 plugins modulares coordinados vía la API de OpenCode. Cada plugin añade capacidades específicas.

| Plugin | Archivo | Función | Tools/Hooks |
|--------|---------|---------|-------------|
| memory.js | `plugins/memory.js` | Memoria persistente simple (facts JSON) | `memory_add`, `memory_search`, `memory_forget` |
| memory-v2.js | `plugins/memory-v2.js` | Engramas SQLite + FTS5 de alto valor | `memory_signal`, `memory_search_v2`, `memory_context`, `memory_timeline`, `memory_get`, `memory_update`, `memory_summarize_session` |
| personalities.js | `plugins/personalities.js` | Personalidades vía SOUL.md | `set_personality` |
| guardrails.js | `plugins/guardrails.js` | Anti-loop y detección de errores | Hook automático |
| checkpoints.js | `plugins/checkpoints.js` | Snapshots automáticos antes de edit/write | Hook automático |
| kanban.js | `plugins/kanban.js` | Tablero de tareas CRUD | `kanban_create`, `kanban_list`, `kanban_update`, `kanban_delete` |
| sandbox.js | `plugins/sandbox.js` | Ejecución aislada en Docker | `sandbox_exec` |
| validator.js | `plugins/validator.js` | Validación de API keys al inicio | Hook startup |
| organic-rdd.js | `plugins/organic-rdd.js` | Review por riesgo con receipts globales y gate manual | `review_mode_get`, `review_mode_set`, `review_start`, `review_status`, `review_capture`, `review_verify`, `review_finalize`, `review_gate` |

## Almacenamiento
| Datos | Ubicación | Formato |
|-------|-----------|---------|
| Facts usuario/proyecto | `~/.local/share/opencode/plugins-data/memory.json` | JSON |
| Engramas | `~/.local/share/opencode/plugins-data/memory.db` | SQLite + FTS5 |
| Sesiones | Tabla `sessions` dentro de `memory.db` | SQLite |

## Integración
- `opencode.jsonc` → registra los 8 plugins
- Inyectan en `chat.system.transform` al inicio de sesión

## Ver también
- [[OpenCode System]]
- [[Agentes OpenCode]]
- [[MCP Servers OpenCode]]
