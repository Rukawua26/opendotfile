# OpenCode Config Backup

Configuración portátil de OpenCode. Clona, ejecuta `install.sh`, y tienes tu entorno completo en cualquier PC.

## Últimas actualizaciones

- `Software Architect` decide la ubicación del código por ownership, imports y uso real; no promueve abstracciones solo por cantidad de consumidores.
- 16 agentes activos seleccionados desde una biblioteca de más de 200 agentes.
- Tres perfiles (`work`, `personal`, `light`) con compactación y límites de salida ajustados al coste de cada tarea.
- Enrutamiento a modelos locales mediante `local-model-router`; MCP costosos desactivados por defecto.

## Qué incluye

| Categoría | Cantidad | Ubicación |
|-----------|----------|-----------|
| Agents activos | 16 | `agents/` (symlinks a `agents-library/`) |
| Agents template | 200+ | `agents-library/` |
| Skills | 20 | `skills/` (copia a `~/opencode-custom/skills`) |
| Plugins disponibles | 8 | `plugins/` |
| Integraciones MCP | 5 | local models, memoria, docs, diagramas y navegador |
| Perfiles | 3 | `profiles/work`, `profiles/personal`, `profiles/light` |
| Rules globales | 1 | `AGENTS.md` (copia a `~/AGENTS.md`) |

### Plugins

- `personalities.js` — personalidades vía SOUL.md
- `guardrails.js` — anti-loop y detección de errores
- `checkpoints.js` — snapshots antes de edits
- `kanban.js` — tablero de tareas
- `sandbox.js` — ejecución aislada en Docker
- `validator.js` — validación de API keys
- `session-metrics.js` — métricas de sesiones, tokens y delegaciones
- `auto-memory.js` — captura de decisiones para `memory-adapter` en el perfil `work`

### Skills

`accessibility-audit`, `code-reviewer-v2`, `debug-bugs`, `defuddle`, `inbox-triage`, `json-canvas`, `local-model-router`, `loop-engineering`, `modes`, `multiagent-orchestrator`, `obsidian-bases`, `obsidian-cli`, `obsidian-markdown`, `prompts`, `sdd-implement`, `sdd-plan`, `sdd-specify`, `sdd-tasks`, `security-review`, `tdd-workflow`

### MCP

- `local-model-router` — Ollama local bajo demanda; activo en la configuración base.
- `memory-adapter` — memoria técnica; activo en `work`.
- `context7` y `diagram-generator` — activos en `work`, desactivados por defecto.
- `playwright` — disponible pero desactivado por defecto.

### Perfiles

| | `work` | `personal` | `light` |
|---|---|---|---|
| Modelo | `openai/gpt-5.6-sol` | `openai/gpt-5.4-mini` | `openai/gpt-5.4-mini` |
| Plugins | 7 | 5 | 4 |
| `tail_turns` | 6 | 4 | 3 |
| Salida de tools | 200 líneas / 8 KiB | 120 líneas / 8 KiB | 80 líneas / 4 KiB |

## Instalación en otra PC

```bash
git clone https://github.com/Rukawua26/opencode-config-backup.git
cd opencode-config-backup
./install.sh
```

El script:
1. Crea backup de config existente
2. Copia config a `~/.config/opencode/`
3. Copia skills a `~/opencode-custom/skills/`
4. Copia reglas a `~/AGENTS.md`
5. Reemplaza `__HOME__` por tu home real
6. Reconecta symlinks de agents
7. Instala dependencias npm

Después: edita `~/.config/opencode/.env` con tus API keys y reinicia OpenCode.

## Seguridad

- `.env` nunca se sube (está en `.gitignore`)
- `node_modules/` no se sube
- `memory.db` y `kanban.json` se suben (estado portable)

## Perfiles

```bash
opencode-profile   # menú interactivo
opencode-work      # perfil completo
opencode-personal  # perfil económico
```

## Archivos de estado

- `memory.db` — memoria técnica portable
- `kanban.json` — tablero de tareas

Revisa los archivos de estado antes de publicar un fork, ya que pueden contener información de trabajo.

---

*Rukawua26 | [GitHub](https://github.com/Rukawua26)*
