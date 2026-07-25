<p align="center">
  <img src="https://img.shields.io/badge/OpenCode-Config-6366f1?style=for-the-badge&labelColor=1e1b4b&color=6366f1" alt="OpenCode Config"/>
  <img src="https://img.shields.io/badge/Agentes-16-22c55e?style=for-the-badge&labelColor=1e1b4b" alt="Agents"/>
  <img src="https://img.shields.io/badge/Skills-20-f59e0b?style=for-the-badge&labelColor=1e1b4b" alt="Skills"/>
  <img src="https://img.shields.io/badge/Plugins-8-ec4899?style=for-the-badge&labelColor=1e1b4b" alt="Plugins"/>
  <img src="https://img.shields.io/badge/Profiles-3-8b5cf6?style=for-the-badge&labelColor=1e1b4b" alt="Profiles"/>
</p>

<p align="center">
  <strong>Configuración portátil de OpenCode con optimización de tokens,<br>multiagente por capas, ruteo local de modelos y Spec-Driven Development.</strong>
</p>

<p align="center">
  <a href="#-instalación">Instalación</a> ·
  <a href="#arquitectura">Arquitectura</a> ·
  <a href="#fluxo-de-trabajo">Flujo de trabajo</a> ·
  <a href="#perfiles">Perfiles</a> ·
  <a href="#componentes">Componentes</a> ·
  <a href="#seguridad">Seguridad</a>
</p>

---

## Características principales

| | | |
|---|---|---|
| **16 agentes activos** | Seleccionados de una biblioteca de 233 roles especializados | `agents/` → symlinks a `agents-library/` |
| **20 skills SDD** | Specify → Plan → Tasks → Implement → Verify | `opencode-custom/skills/` |
| **8 plugins** | Guardrails, checkpoints, kanban, sandbox, métricas | `plugins/` |
| **5 integraciones MCP** | Router local Ollama, memoria, docs, diagramas, navegador | `mcp/` |
| **3 perfiles** | `work` (premium), `personal` (ligero), `light` (ultrarrápido) | `profiles/` |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
│                   ~/AGENTS.md + ~/.config/opencode/             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OpenCode CLI (Bun)                           │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │  AGENTS.md    │  │  opencode.jsonc│  │   .env (APIs)   │    │
│  │  Reglas globales│ │  Config central│ │  Keys seguras    │    │
│  └───────────────┘  └───────────────┘  └──────────────────┘    │
└────┬─────────────┬─────────────┬─────────────┬─────────────────┘
     │             │             │             │
     ▼             ▼             ▼             ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐
│ AGENTS  │ │  SKILLS  │ │ PLUGINS  │ │  MCP SERVERS  │
│  (16)   │ │  (20)    │ │  (8)     │ │    (5)        │
└────┬────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘
     │           │            │               │
     ▼           ▼            ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE SUBAGENTES                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Coordinador  │  │ Implementador│  │  Verificador │      │
│  │  (main agent) │──│  (Task tool) │──│  (evidencia) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  Depth limit: 1 │ Max 3 subagentes por feature              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  LOCAL MODEL ROUTER (Ollama)                  │
│                                                             │
│  qwen2.5-coder:3b  → código mecánico                        │
│  qwen3.5:4b        → explicaciones / chat                   │
│  phi4-mini          → razonamiento lógico                    │
│                                                             │
│  Regla: modelos locales = datos no confiables                │
│  Apagado automático tras 10 min sin uso                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de trabajo

### Ciclo de vida de una feature (SDD)

```
Especificación              Plan                    Tareas
┌──────────────┐     ┌──────────────┐      ┌──────────────┐
│  spec.md     │────▶│  plan.md     │─────▶│  tasks.md    │
│  Alcance     │     │  Arquitectura│      │  Lista       │
│  Criterios   │     │  Riesgos     │      │  Verificable │
└──────────────┘     └──────────────┘      └──────┬───────┘
                                                   │
                        ┌──────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                     IMPLEMENTACIÓN                            │
│                                                              │
│  Coordinador ─── reparte ──┬── Implementador A (Task tool)   │
│  (agente principal)        │── Implementador B (Task tool)   │
│                            └── Implementador C (Task tool)   │
│                                                              │
│  Cada subagente recibe: spec + plan + tarea + archivos       │
│  Cada subagente devuelve: resumen + evidencia + comandos     │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                       VERIFICACIÓN                            │
│                                                              │
│  Verifier ──── diff ──── tests ──── criterios ──── PASS/FAIL │
│  (evidencia independiente, sin modificar archivos)            │
└──────────────────────────────────────────────────────────────┘
```

### Enrutamiento de modelos

```
                    ┌─────────────────┐
                    │   Tarea nueva   │
                    └────────┬────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  ¿Es crítica o   │
                   │  de seguridad?   │
                   └────────┬─────────┘
                    sí      │      no
              ┌─────────────┘      └─────────────┐
              ▼                                  ▼
     ┌────────────────┐              ┌───────────────────┐
     │  Cloud model   │              │  route_model()    │
     │  gpt-5.6-sol   │              │  clasifica tarea  │
     └────────────────┘              └────────┬──────────┘
                                              │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                     │ coder (3b)   │ │ chat (4b)    │ │ reasoning    │
                     │ código       │ │ explicaciones│ │ lógica       │
                     └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Perfiles

| | `work` | `personal` | `light` |
|---|:---:|:---:|:---:|
| **Modelo** | `gpt-5.6-sol` | `gpt-5.4-mini` | `gpt-5.4-mini` |
| **Plugins** | 7 | 5 | 4 |
| **Compactación** | `tail_turns: 6` | `tail_turns: 4` | `tail_turns: 3` |
| **Salida tools** | 200 líneas / 8 KiB | 120 líneas / 8 KiB | 80 líneas / 4 KiB |
| **MCP** | Todos | — | — |
| **Uso ideal** | Features complejas | Tareas mecánicas | Búsqueda rápida |

```bash
opencode-profile   # menú interactivo
opencode-work      # perfil completo
opencode-personal  # perfil económico
```

---

## Instalación

```bash
git clone https://github.com/Rukawua26/opencode-config-backup.git
cd opencode-config-backup
./install.sh
```

**El script:**
1. Crea backup de la config existente en `~/.config/opencode.backup.<timestamp>`
2. Copia config a `~/.config/opencode/`
3. Copia skills a `~/opencode-custom/skills/`
4. Copia reglas a `~/AGENTS.md`
5. Reemplaza `__HOME__` por tu home real
6. Reconecta symlinks de agents
7. Instala dependencias npm

> Después: edita `~/.config/opencode/.env` con tus API keys y reinicia OpenCode.

---

## Componentes

### Plugins

| Plugin | Descripción |
|--------|-------------|
| `personalities.js` | Personalidades vía SOUL.md |
| `guardrails.js` | Anti-loop y detección de errores |
| `checkpoints.js` | Snapshots automáticos antes de edits |
| `kanban.js` | Tablero de tareas integrado |
| `sandbox.js` | Ejecución aislada en Docker |
| `validator.js` | Validación de API keys en startup |
| `session-metrics.js` | Métricas de sesiones, tokens y delegaciones |
| `auto-memory.js` | Captura de decisiones para `memory-adapter` |

### Skills

`accessibility-audit` · `code-reviewer-v2` · `debug-bugs` · `defuddle` · `inbox-triage` · `json-canvas` · `local-model-router` · `loop-engineering` · `modes` · `multiagent-orchestrator` · `obsidian-bases` · `obsidian-cli` · `obsidian-markdown` · `prompts` · `sdd-implement` · `sdd-plan` · `sdd-specify` · `sdd-tasks` · `security-review` · `tdd-workflow`

### MCP servers

| Servidor | Estado | Descripción |
|----------|--------|-------------|
| `local-model-router` | ✅ Activo | Ollama local bajo demanda |
| `memory-adapter` | 🔶 Work | Memoria técnica persistente |
| `context7` | 🔶 Work | Docs de librerías actualizadas |
| `diagram-generator` | 🔶 Work | Draw.io / Mermaid / Excalidraw |
| `playwright` | ⏸️ Off | Automatización de navegador |

---

## Seguridad

- `.env` nunca se sube (está en `.gitignore`)
- `node_modules/` no se sube
- `memory.db` y `kanban.json` se suben (estado portable)
- Modelos locales tratados como datos no confiables
- Agentes con permisos de escritura restringidos por defecto

> Revisa los archivos de estado antes de publicar un fork, ya que pueden contener información de trabajo.

---

## Estructura del repositorio

```
opencode-config-backup/
├── agents/                    # 16 agentes activos (symlinks)
├── agents-library/            # 233 agentes disponibles
├── skills/                    # 20 skills SDD + utilidades
├── plugins/                   # 8 plugins (personalities, guardrails...)
├── mcp/                       # 5 servidores MCP
│   ├── local-model-router.js  # Router Ollama local
│   └── memory-adapter/        # Memoria persistente
├── profiles/
│   ├── work/opencode.jsonc    # Perfil completo
│   ├── personal/opencode.jsonc# Perfil económico
│   └── light/opencode.jsonc   # Perfil ultrarrápido
├── AGENTS.md                  # Reglas globales del agente
├── install.sh                 # Instalador portátil
└── opencode.jsonc             # Config central
```

---

*Rukawua26 · [GitHub](https://github.com/Rukawua26)*
