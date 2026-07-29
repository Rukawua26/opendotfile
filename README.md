<div align="center">

<!-- === HERO === -->
<img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/hero-banner.svg" width="100%" alt="OpenCode Config Banner"/>

<br/>

# <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/opencode-icon.svg" width="36" height="36"/> OpenCode Config Backup

### <sub>Tu estación de trabajo de IA completa. Portable. Potente. Ahorrador de tokens.</sub>

<br/>

<a href="https://github.com/Rukawua26/opencode-config-backup">
  <img src="https://img.shields.io/badge/📂_Repositorio-Clonar-y_usar-22c55e?style=for-the-badge&labelColor=0f172a&color=22c55e" alt="Repositorio"/>
</a>
<a href="https://github.com/Rukawua26/opencode-config-backup/blob/main/install.sh">
  <img src="https://img.shields.io/badge/🚀_Instalación-un_comando-3b82f6?style=for-the-badge&labelColor=0f172a&color=3b82f6" alt="Instalación"/>
</a>
<a href="https://github.com/Rukawua26/opencode-config-backup#arquitectura">
  <img src="https://img.shields.io/badge/🧠_Agentes-16_activos-8b5cf6?style=for-the-badge&labelColor=0f172a&color=8b5cf6" alt="Agents"/>
</a>
<a href="https://github.com/Rukawua26/opencode-config-backup#componentes">
  <img src="https://img.shields.io/badge/⚡_Skills-20_SDD-f59e0b?style=for-the-badge&labelColor=0f172a&color=f59e0b" alt="Skills"/>
</a>
<a href="https://github.com/Rukawua26/opencode-config-backup#perfiles">
  <img src="https://img.shields.io/badge/🎯_Perfiles-3_perfiles-ec4899?style=for-the-badge&labelColor=0f172a&color=ec4899" alt="Profiles"/>
</a>
<a href="https://github.com/Rukawua26/opencode-config-backup#componentes">
  <img src="https://img.shields.io/badge/🔌_Plugins-8_activos-06b6d4?style=for-the-badge&labelColor=0f172a&color=06b6d4" alt="Plugins"/>
</a>
<a href="https://github.com/Rukawua26/opencode-config-backup#componentes">
  <img src="https://img.shields.io/badge/📡_MCP-5_servidores-f97316?style=for-the-badge&labelColor=0f172a&color=f97316" alt="MCP"/>
</a>

<br/>

<a href="#-arquitectura"><img src="https://img.shields.io/badge/⬇_Arquitectura-visual-1e40af?style=flat-square&labelColor=1e3a5f" alt="Arquitectura"/></a>
<a href="#-flujo-sdd"><img src="https://img.shields.io/badge/⬇_Flujo_SDD-ciclo-1e40af?style=flat-square&labelColor=1e3a5f" alt="Flujo SDD"/></a>
<a href="#-ruteo-de-modelos"><img src="https://img.shields.io/badge/⬇_Ruteo_Modelos-routing-1e40af?style=flat-square&labelColor=1e3a5f" alt="Ruteo"/></a>
<a href="#-perfiles"><img src="https://img.shields.io/badge/⬇_Perfiles-comparativa-1e40af?style=flat-square&labelColor=1e3a5f" alt="Perfiles"/></a>

</div>

---

<br/>

## ✨ Características principales

<div align="center">
<table>
  <tr>
    <td align="center" width="20%">
      <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/icon-agents.svg" width="48" height="48"/><br/>
      <strong><sub>16 Agentes</sub></strong><br/>
      <sub>Seleccionados de 233</sub>
    </td>
    <td align="center" width="20%">
      <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/icon-skills.svg" width="48" height="48"/><br/>
      <strong><sub>20 Skills</sub></strong><br/>
      <sub>Ciclo SDD completo</sub>
    </td>
    <td align="center" width="20%">
      <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/icon-plugins.svg" width="48" height="48"/><br/>
      <strong><sub>8 Plugins</sub></strong><br/>
      <sub>Guardrails + Kanban + Sandbox</sub>
    </td>
    <td align="center" width="20%">
      <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/icon-mcp.svg" width="48" height="48"/><br/>
      <strong><sub>5 MCPs</sub></strong><br/>
      <sub>Ollama + Memoria + Docs</sub>
    </td>
    <td align="center" width="20%">
      <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/icon-profiles.svg" width="48" height="48"/><br/>
      <strong><sub>3 Perfiles</sub></strong><br/>
      <sub>Work / Personal / Light</sub>
    </td>
  </tr>
</table>
</div>

---

<br/>

## 🏗️ Arquitectura

<div align="center">
  <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/architecture-diagram.svg" width="100%" alt="Arquitectura OpenCode"/>
</div>

<div align="center">

```mermaid
flowchart TB
    subgraph USER["👤 USUARIO"]
        U1["AGENTS.md<br/>Reglas globales"]
        U2["~/.config/opencode/<br/>Config del sistema"]
        U3[".env<br/>API Keys seguras"]
    end

    subgraph CORE["⚙️ OpenCode CLI (Bun)"]
        direction TB
        C1["AGENTS<br/>"]
        C2["SKILLS<br/>"]
        C3["PLUGINS<br/>"]
        C4["MCP SERVERS<br/>"]
    end

    subgraph AGENTS_LAYER["🤖 CAPA DE AGENTES"]
        direction LR
        A1["🧠 Software<br/>Architect"]
        A2["👨‍💻 Frontend<br/>Developer"]
        A3["🔒 Security<br/>Engineer"]
        A4["📝 Code<br/>Reviewer"]
        A5["🔍 Verifier"]
        A6["📋 Product<br/>Manager"]
        A7["🏗️ Backend<br/>Architect"]
        A8["🛠️ DevOps<br/>Automator"]
    end

    subgraph MULTIAGENT["👥 MULTIAGENTE POR CAPAS"]
        direction LR
        M1["🎯 Coordinador<br/>agente principal"]
        M2["⚡ Implementador A<br/>Task tool"]
        M3["⚡ Implementador B<br/>Task tool"]
        M4["✅ Verifier<br/>evidencia"]
    end

    subgraph LOCAL["🏠 LOCAL MODEL ROUTER"]
        direction LR
        L1["🔧 coder:3b<br/>código mecánico"]
        L2["💬 chat:4b<br/>explicaciones"]
        L3["🧩 reasoning<br/>lógica"]
    end

    USER --> CORE
    CORE --> AGENTS_LAYER
    AGENTS_LAYER --> MULTIAGENT
    MULTIAGENT --> LOCAL

    style USER fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
    style CORE fill:#0f172a,stroke:#3b82f6,color:#e2e8f0,stroke-width:2px
    style AGENTS_LAYER fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0,stroke-width:2px
    style MULTIAGENT fill:#172554,stroke:#06b6d4,color:#e2e8f0,stroke-width:2px
    style LOCAL fill:#1a1a2e,stroke:#f97316,color:#e2e8f0,stroke-width:2px
```

</div>

---

<br/>

## 🔄 Flujo SDD (Spec-Driven Development)

<div align="center">
  <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/sdd-flow.svg" width="100%" alt="Flujo SDD"/>
</div>

<div align="center">

```mermaid
flowchart LR
    S["📝 SPECIFY<br/>spec.md<br/>Alcance + Criterios"]
    P["📋 PLAN<br/>plan.md<br/>Arquitectura + Riesgos"]
    T["✅ TASKS<br/>tasks.md<br/>Lista verificable"]
    I["🔨 IMPLEMENT<br/>Multiagente por capas"]
    V["🔍 VERIFY<br/>PASS / FAIL + Evidencia"]

    S -->|"definir alcance"| P
    P -->|"diseñar solución"| T
    T -->|"ejecutar tareas"| I
    I -->|"validar resultado"| V
    V -->|"si FAIL → volver a I"| S

    style S fill:#22c55e,stroke:#16a34a,color:#052e16,stroke-width:2px
    style P fill:#3b82f6,stroke:#2563eb,color:#1e3a8a,stroke-width:2px
    style T fill:#8b5cf6,stroke:#7c3aed,color:#2e1065,stroke-width:2px
    style I fill:#f59e0b,stroke:#d97706,color:#451a03,stroke-width:2px
    style V fill:#06b6d4,stroke:#0891b2,color:#083344,stroke-width:2px
```

</div>

**Cómo funciona:**
1. 📝 **Spec**: Define qué se construye y qué éxito significa
2. 📋 **Plan**: Diseña la solución técnica con alternativas
3. ✅ **Tasks**: Descompone en tareas pequeñas y verificables
4. 🔨 **Implement**: Subagentes ejecutan tareas aisladas
5. 🔍 **Verify**: Verificador confirma con evidencia independiente

### Organic RDD

Organic RDD revisa el candidato despues de implementarlo y adapta la ceremonia al riesgo real:

- **Tier 0**: documentacion, sin revision adicional
- **Tier 1**: skills y commands, `code-review` + verificacion
- **Tier 2**: configuracion central, `code-review` + `verifier` + verificacion
- **Tier 3**: runtime, permisos, seguridad, persistencia o gates; agrega lentes especializadas

Los receipts canonicos viven en `~/.local/share/opencode/plugins-data/organic-rdd/`. El gate es manual en el MVP. `review mode=disabled` produce `unmanaged`, nunca `approved`.

Limitaciones MVP:

- El projection principal es `explicit-files`: el receipt certifica los archivos listados, no todo el workspace.
- En repos Git, `review_start` guarda `git.head`, archivos cambiados y advertencias cuando hay cambios fuera del manifest.
- `review_gate` mantiene compatibilidad por defecto; usa `strict_manifest=true` para fallar si Git detecta archivos omitidos.
- Las eliminaciones Git se reportan como `manifest_has_deletions`; `explicit-files` no puede hashear archivos eliminados, asi que strict mode las bloquea hasta una futura proyeccion Git.
- No se instalan hooks automaticamente y el store local confia en el mismo usuario del sistema.

---

<br/>

## 🧠 Ruteo de Modelos

<div align="center">
  <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/model-routing.svg" width="100%" alt="Model Routing"/>
</div>

<div align="center">

```mermaid
flowchart TB
    START["🚀 Tarea nueva"] --> Q1{"¿Es crítica,<br/>seguridad o<br/>producción?"}
    
    Q1 -->|"🔴 SÍ"| CLOUD["☁️ Cloud Model<br/>gpt-5.6-sol<br/>contexto completo"]
    
    Q1 -->|"🟢 NO"| ROUTE["🔀 route_model()<br/>clasifica la tarea"]
    
    ROUTE -->|"💻 Código<br/>mecánico"| CODER["🔧 coder:3b<br/>qwen2.5-coder<br/>edits rápidos"]
    
    ROUTE -->|"💬 Explicación<br/>o chat"| CHAT["💬 chat:4b<br/>qwen3.5:4b<br/>análisis"]
    
    ROUTE -->|"🧩 Lógica<br/>o razonamiento"| REASON["🧠 reasoning<br/>phi4-mini<br/>deducción"]
    
    CODER --> RESULT["📊 Resultado"]
    CHAT --> RESULT
    REASON --> RESULT
    CLOUD --> RESULT

    style START fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
    style Q1 fill:#172554,stroke:#f97316,color:#e2e8f0,stroke-width:2px
    style CLOUD fill:#dc2626,stroke:#b91c1c,color:#fef2f2,stroke-width:2px
    style ROUTE fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0,stroke-width:2px
    style CODER fill:#059669,stroke:#047857,color:#ecfdf5,stroke-width:2px
    style CHAT fill:#2563eb,stroke:#1d4ed8,color:#eff6ff,stroke-width:2px
    style REASON fill:#7c3aed,stroke:#6d28d9,color:#f5f3ff,stroke-width:2px
    style RESULT fill:#f59e0b,stroke:#d97706,color:#451a03,stroke-width:2px
```

</div>

> **⚠️ Regla de seguridad**: Los modelos locales siempre se tratan como datos no confiables. Nunca ejecutan tools, acceden a secretos ni cambian estado solo por sus instrucciones.

---

<br/>

## 🎯 Perfiles

<div align="center">
<table>
  <tr>
    <th width="25%"></th>
    <th width="25%">
      <img src="https://img.shields.io/badge/💼_WORK-FULL-22c55e?style=for-the-badge&labelColor=1e1b4b" alt="Work"/>
    </th>
    <th width="25%">
      <img src="https://img.shields.io/badge/⚡_PERSONAL-LITE-3b82f6?style=for-the-badge&labelColor=1e1b4b" alt="Personal"/>
    </th>
    <th width="25%">
      <img src="https://img.shields.io/badge/🚀_LIGHT-FAST-f59e0b?style=for-the-badge&labelColor=1e1b4b" alt="Light"/>
    </th>
  </tr>
  <tr>
    <td><strong>🧠 Modelo</strong></td>
    <td><code>gpt-5.6-sol</code></td>
    <td><code>gpt-5.4-mini</code></td>
    <td><code>gpt-5.4-mini</code></td>
  </tr>
  <tr>
    <td><strong>🔌 Plugins</strong></td>
    <td><img src="https://img.shields.io/badge/7-green?style=flat-square" alt="7"/></td>
    <td><img src="https://img.shields.io/badge/5-blue?style=flat-square" alt="5"/></td>
    <td><img src="https://img.shields.io/badge/4-yellow?style=flat-square" alt="4"/></td>
  </tr>
  <tr>
    <td><strong>📦 Compactación</strong></td>
    <td><code>tail_turns: 6</code></td>
    <td><code>tail_turns: 4</code></td>
    <td><code>tail_turns: 3</code></td>
  </tr>
  <tr>
    <td><strong>📏 Salida tools</strong></td>
    <td>200 líneas / 8 KiB</td>
    <td>120 líneas / 8 KiB</td>
    <td>80 líneas / 4 KiB</td>
  </tr>
  <tr>
    <td><strong>📡 MCP</strong></td>
    <td><img src="https://img.shields.io/badge/5_servidores-22c55e?style=flat-square" alt="5"/></td>
    <td><img src="https://img.shields.io/badge/sin_MCP-94a3b8?style=flat-square" alt="0"/></td>
    <td><img src="https://img.shields.io/badge/sin_MCP-94a3b8?style=flat-square" alt="0"/></td>
  </tr>
  <tr>
    <td><strong>🎯 Ideal para</strong></td>
    <td>Features complejas</td>
    <td>Tareas mecánicas</td>
    <td>Búsqueda rápida</td>
  </tr>
</table>
</div>

```bash
opencode-profile   # 🎯 menú interactivo
opencode-work      # 💼 perfil completo (premium)
opencode-personal  # ⚡ perfil económico
```

---

<br/>

## 🚀 Instalación

<div align="center">
  <img src="https://img.shields.io/badge/Solo_3_pasos-0f172a?style=for-the-badge&labelColor=22c55e&color=0f172a" alt="3 pasos"/>
</div>

<br/>

```bash
# 1️⃣ Clonar el repositorio
git clone https://github.com/Rukawua26/opencode-config-backup.git
cd opencode-config-backup

# 2️⃣ Ejecutar el instalador
./install.sh

# 3️⃣ Configurar API keys y reiniciar
nano ~/.config/opencode/.env
# Agrega tus keys → reinicia OpenCode
```

<div align="center">
<table>
  <tr><th>✅ El script hace automáticamente:</th></tr>
  <tr><td>📦 Backup de config existente en <code>~/.config/opencode.backup.&lt;timestamp&gt;</code></td></tr>
  <tr><td>📁 Copia config a <code>~/.config/opencode/</code></td></tr>
  <tr><td>🧩 Copia skills a <code>~/opencode-custom/skills/</code></td></tr>
  <tr><td>📋 Copia reglas a <code>~/AGENTS.md</code></td></tr>
  <tr><td>🔄 Reemplaza <code>__HOME__</code> por tu home real</td></tr>
  <tr><td>🔗 Reconecta symlinks de agents</td></tr>
  <tr><td>📦 Instala dependencias npm</td></tr>
</table>
</div>

---

<br/>

## 🧩 Componentes

### 🔌 Plugins

<div align="center">
<table>
  <tr>
    <td><img src="https://img.shields.io/badge/personalities.js-8b5cf6?style=for-the-badge&labelColor=0f172a" alt="personalities"/></td>
    <td><sub>Personalidades vía SOUL.md</sub></td>
    <td><img src="https://img.shields.io/badge/guardrails.js-ef4444?style=for-the-badge&labelColor=0f172a" alt="guardrails"/></td>
    <td><sub>Anti-loop y detección de errores</sub></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/checkpoints.js-22c55e?style=for-the-badge&labelColor=0f172a" alt="checkpoints"/></td>
    <td><sub>Snapshots antes de edits</sub></td>
    <td><img src="https://img.shields.io/badge/kanban.js-3b82f6?style=for-the-badge&labelColor=0f172a" alt="kanban"/></td>
    <td><sub>Tablero de tareas integrado</sub></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/sandbox.js-f97316?style=for-the-badge&labelColor=0f172a" alt="sandbox"/></td>
    <td><sub>Ejecución aislada en Docker</sub></td>
    <td><img src="https://img.shields.io/badge/validator.js-06b6d4?style=for-the-badge&labelColor=0f172a" alt="validator"/></td>
    <td><sub>Validación de API keys en startup</sub></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/session--metrics.js-ec4899?style=for-the-badge&labelColor=0f172a" alt="metrics"/></td>
    <td><sub>Métricas de sesiones y tokens</sub></td>
    <td><img src="https://img.shields.io/badge/organic--rdd.js-f59e0b?style=for-the-badge&labelColor=0f172a" alt="organic-rdd"/></td>
    <td><sub>Review por riesgo con receipts y gates</sub></td>
  </tr>
</table>
</div>

### ⚡ Skills

<div align="center">
<table>
  <tr>
    <td><img src="https://img.shields.io/badge/sdd--specify-22c55e?style=flat-square" alt="specify"/></td>
    <td><img src="https://img.shields.io/badge/sdd--plan-3b82f6?style=flat-square" alt="plan"/></td>
    <td><img src="https://img.shields.io/badge/sdd--tasks-8b5cf6?style=flat-square" alt="tasks"/></td>
    <td><img src="https://img.shields.io/badge/sdd--implement-f59e0b?style=flat-square" alt="implement"/></td>
    <td><img src="https://img.shields.io/badge/security--review-ef4444?style=flat-square" alt="security"/></td>
    <td><img src="https://img.shields.io/badge/debug--bugs-f97316?style=flat-square" alt="debug"/></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/code--reviewer--v2-06b6d4?style=flat-square" alt="reviewer"/></td>
    <td><img src="https://img.shields.io/badge/tdd--workflow-ec4899?style=flat-square" alt="tdd"/></td>
    <td><img src="https://img.shields.io/badge/modes-1e40af?style=flat-square" alt="modes"/></td>
    <td><img src="https://img.shields.io/badge/defuddle-9333ea?style=flat-square" alt="defuddle"/></td>
    <td><img src="https://img.shields.io/badge/multiagent--orchestrator-14b8a6?style=flat-square" alt="multi"/></td>
    <td><img src="https://img.shields.io/badge/local--model--router-d946ef?style=flat-square" alt="router"/></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/obsidian--cli-0ea5e9?style=flat-square" alt="cli"/></td>
    <td><img src="https://img.shields.io/badge/obsidian--markdown-2563eb?style=flat-square" alt="md"/></td>
    <td><img src="https://img.shields.io/badge/obsidian--bases-7c3aed?style=flat-square" alt="bases"/></td>
    <td><img src="https://img.shields.io/badge/json--canvas-a855f7?style=flat-square" alt="canvas"/></td>
    <td><img src="https://img.shields.io/badge/inbox--triage-f43f5e?style=flat-square" alt="inbox"/></td>
    <td><img src="https://img.shields.io/badge/prompts-84cc16?style=flat-square" alt="prompts"/></td>
  </tr>
  <tr>
    <td><img src="https://img.shields.io/badge/loop--engineering-2dd4bf?style=flat-square" alt="loop"/></td>
    <td><img src="https://img.shields.io/badge/accessibility--audit-34d399?style=flat-square" alt="a11y"/></td>
  </tr>
</table>
</div>

### 📡 MCP Servers

<div align="center">
<table>
  <tr>
    <th>Servidor</th>
    <th>Estado</th>
    <th>Descripción</th>
  </tr>
  <tr>
    <td><code>local-model-router</code></td>
    <td><img src="https://img.shields.io/badge/✅_Activo-22c55e?style=flat-square" alt="Activo"/></td>
    <td>Ollama local bajo demanda</td>
  </tr>
  <tr>
    <td><code>memory-adapter</code></td>
    <td><img src="https://img.shields.io/badge/🔶_Work-3b82f6?style=flat-square" alt="Work"/></td>
    <td>Memoria técnica persistente</td>
  </tr>
  <tr>
    <td><code>context7</code></td>
    <td><img src="https://img.shields.io/badge/🔶_Work-3b82f6?style=flat-square" alt="Work"/></td>
    <td>Docs de librerías actualizadas</td>
  </tr>
  <tr>
    <td><code>diagram-generator</code></td>
    <td><img src="https://img.shields.io/badge/🔶_Work-3b82f6?style=flat-square" alt="Work"/></td>
    <td>Draw.io / Mermaid / Excalidraw</td>
  </tr>
  <tr>
    <td><code>playwright</code></td>
    <td><img src="https://img.shields.io/badge/⏸️_Off-94a3b8?style=flat-square" alt="Off"/></td>
    <td>Automatización de navegador</td>
  </tr>
</table>
</div>

---

<br/>

## 🛡️ Seguridad

<div align="center">
<table>
  <tr>
    <td><img src="https://img.shields.io/badge/🔒_Seguro-22c55e?style=for-the-badge&labelColor=0f172a" alt="Seguro"/></td>
  </tr>
</table>
</div>

- 🚫 `.env` **nunca** se sube (está en `.gitignore`)
- 🚫 `node_modules/` **nunca** se sube
- ✅ `memory.db` y `kanban.json` se suben (estado portable)
- ⚠️ Modelos locales tratados como **datos no confiables**
- 🔒 Agentes con permisos de escritura **restringidos por defecto**

> ⚠️ **Revisa** los archivos de estado antes de publicar un fork, ya que pueden contener información de trabajo.

---

<br/>

## 📂 Estructura del repositorio

```
opencode-config-backup/
├── 🤖 agents/                    # 16 agentes activos (symlinks)
├── 📚 agents-library/            # 233 agentes disponibles
├── ⚡ skills/                    # 20 skills SDD + utilidades
├── 🔌 plugins/                   # 8 plugins activos
│   ├── personalities.js          # 🎭 Personalidades
│   ├── guardrails.js             # 🛡️ Anti-loop
│   ├── checkpoints.js            # 💾 Snapshots
│   ├── kanban.js                 # 📋 Tablero
│   ├── sandbox.js                # 🐳 Docker
│   ├── validator.js              # 🔑 API keys
│   ├── session-metrics.js        # 📊 Métricas
│   └── organic-rdd.js            # Review por riesgo
├── 📡 mcp/                       # 5 servidores MCP
│   ├── local-model-router.js     # 🔀 Router Ollama
│   └── memory-adapter/           # 💾 Memoria persistente
├── 🎯 profiles/
│   ├── work/opencode.jsonc       # 💼 Perfil completo
│   ├── personal/opencode.jsonc   # ⚡ Perfil económico
│   └── light/opencode.jsonc      # 🚀 Perfil ultrarrápido
├── 📋 AGENTS.md                  # Reglas globales del agente
├── 🚀 install.sh                 # Instalador portátil
└── ⚙️ opencode.jsonc             # Config central
```

---

<br/>

<div align="center">
  <img src="https://raw.githubusercontent.com/Rukawua26/opencode-config-backup/main/assets/footer-wave.svg" width="100%" alt="Footer"/>
  <br/>
  <strong>Creado por</strong> <a href="https://github.com/Rukawua26"><img src="https://img.shields.io/badge/Rukawua26-Developer-6366f1?style=for-the-badge&labelColor=0f172a" alt="Rukawua26"/></a>
  <br/><br/>
  <sub>Configuración portátil de OpenCode · Optimizada para ahorro de tokens</sub>
</div>
