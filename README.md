<div align="center">

# <img src="https://raw.githubusercontent.com/Rukawua26/opendotfile/main/assets/opencode-icon.svg" width="32" height="32"/> OpenDotfile

### <sub>Estación de trabajo de IA portable, completa y optimizada para ahorro de tokens.</sub>

</div>

> [!CAUTION]
> **Repositorio historicico (archivado).** OpenDotfile se fusionó en
> [OpenCode Ecosystem](https://github.com/Rukawua26/opencode-ecosystem),
> que ahora es la unica fuente canónica (instalador, perfiles, plugins,
> memoria, router y Organic RDD con lineage/receipts/refuter). No ejecutes
> `install.sh` desde este repositorio para nuevas instalaciones; el contenido
> se conserva únicamente como referencia histórica.

---

## ✨ Qué es

Configuración portable de OpenCode con 16 agentes, 15 skills, 5 plugins esenciales, perfiles y MCP servers. Todo el ciclo SDD (spec → plan → tasks → implement → verify) con review por riesgo mediante Organic RDD.

### Cómo funciona

```mermaid
flowchart TB
    U["👤 Usuario<br/>prompt / tarea"] --> C["⚙️ OpenCode CLI"]

    subgraph CORE["Configuración portable"]
        A["🤖 16 Agentes"] 
        S["⚡ 21 Skills<br/>ciclo SDD"]
        P["🔌 Plugins<br/>guardrails · checkpoints<br/>validator · metrics · rdd"]
        M["📡 MCP Servers<br/>router · memory · context7"]
    end

    C --> CORE
    C --> R["🔀 Route Model"]
    R -->|crítico| CLOUD["☁️ Cloud<br/>gpt-5.6-sol"]
    R -->|mecánico| LOC["🏠 Local<br/>coder · chat · reasoning"]
    CORE --> O["🔄 Organic RDD<br/>spec → review → gate"]
    O -->|commit| G["🔒 Git gate<br/>pre-commit"]

    style U fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style C fill:#0f172a,stroke:#3b82f6,color:#e2e8f0
    style CORE fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0
    style O fill:#172554,stroke:#f59e0b,color:#e2e8f0
    style G fill:#451a03,stroke:#f59e0b,color:#fde68a
    style R fill:#1e293b,stroke:#06b6d4,color:#e2e8f0
```

---

## 🚀 Instalación

```bash
# 1️⃣ Clonar el repositorio
git clone https://github.com/Rukawua26/opendotfile.git
cd opendotfile

# 2️⃣ Ejecutar el instalador
./install.sh

# 3️⃣ Configurar API keys y reiniciar
nano ~/.config/opencode/.env
```

El script hace automáticamente: backup de la config existente, copia a `~/.config/opencode/`, skills a `~/opencode-custom/skills/`, reemplaza `__HOME__` por tu home real, reconecta symlinks de agents e instala dependencias npm.

Para habilitar el provider principal, configura localmente `OPENAI_API_KEY` en `~/.config/opencode/.env`. Anthropic (`ANTHROPIC_API_KEY`) es opcional.

---

## 🎯 Perfiles

| | 💼 Work | ⚡ Personal | 🚀 Light |
|---|---|---|---|
| **Modelo** | `gpt-5.6-sol` | `gpt-5.4-mini` | `gpt-5.4-mini` |
| **Plugins** | 9 | 6 | 5 |
| **MCP** | 4 servidores | sin MCP | sin MCP |
| **Ideal para** | Features complejas | Tareas mecánicas | Búsqueda rápida |

```bash
opencode-profile   # menú interactivo
opencode-work      # perfil completo
opencode-personal  # perfil económico
```

---

## 🔄 Flujo SDD

```mermaid
flowchart LR
    S["📝 Spec<br/>alcance + criterios"] --> P["📋 Plan<br/>solución técnica"]
    P --> T["✅ Tasks<br/>tareas verificables"]
    T --> I["🔨 Implement<br/>subagentes"]
    I --> V["🔍 Verify<br/>evidencia"]
    V -->|FAIL| I
    V -->|PASS| D["🚀 Done"]

    style S fill:#22c55e,stroke:#16a34a,color:#052e16
    style P fill:#3b82f6,stroke:#2563eb,color:#1e3a8a
    style T fill:#8b5cf6,stroke:#7c3aed,color:#2e1065
    style I fill:#f59e0b,stroke:#d97706,color:#451a03
    style V fill:#06b6d4,stroke:#0891b2,color:#083344
    style D fill:#16a34a,stroke:#15803d,color:#052e16
```

1. **Spec** → define alcance y criterios de éxito
2. **Plan** → diseña la solución técnica
3. **Tasks** → descompone en tareas verificables
4. **Implement** → subagentes ejecutan tareas aisladas
5. **Verify** → verificador confirma con evidencia independiente

### Organic RDD

```mermaid
flowchart TB
    C["💾 Candidato<br/>implementado"] --> R{"Tier de riesgo"}
    R -->|0| OK["✔️ Sin revisión"]
    R -->|1| CR["👁️ code-review"]
    R -->|2| CR2["👁️ code-review<br/>✅ verifier"]
    R -->|3| CR3["👁️ code-review<br/>✅ verifier<br/>🔒 lentes especiales"]
    CR & CR2 & CR3 --> REC["📜 Receipt"]
    REC -->|approved| PTR["📍 Pointer file<br/>.organic-rdd/receipt"]
    PTR --> G["🔒 git gate pre-commit"]
    G -->|fresh + manifest ok| OK
    G -->|stale o fuera de manifest| BL["⛔ Bloq. commit"]

    style R fill:#172554,stroke:#f97316,color:#e2e8f0
    style REC fill:#1e293b,stroke:#8b5cf6,color:#e2e8f0
    style G fill:#451a03,stroke:#f59e0b,color:#fde68a
    style BL fill:#7f1d1d,stroke:#ef4444,color:#fecaca
    style OK fill:#14532d,stroke:#22c55e,color:#dcfce7
```

Review del candidato adaptado al riesgo real:

- **Tier 0**: documentación, sin revisión adicional
- **Tier 1**: skills y commands → `code-review` + verificación
- **Tier 2**: configuración central → `code-review` + `verifier`
- **Tier 3**: runtime, permisos, seguridad o gates → lentes especializadas

Receipts en `~/.local/share/opencode/plugins-data/organic-rdd/`. Incluye identidad de proyecto (`project_id = sha256(project_path)`), validación read-only (`review_validate`) y un **git gate pre-commit** que bloquea commits con candidatos stale o archivos staged fuera del manifest (instala con `./install.sh --with-git-gate`). `review mode=disabled` produce `unmanaged`, nunca `approved`.

---

## 🧠 Ruteo de Modelos

```mermaid
flowchart TB
    T["🚀 Tarea"] --> Q{"¿Crítica,<br/>seguridad o<br/>producción?"}
    Q -->|SÍ| C["☁️ Cloud gpt-5.6-sol<br/>contexto completo"]
    Q -->|NO| RO["🔀 route_model()"]
    RO -->|código| CO["🔧 coder:3b"]
    RO -->|chat| CH["💬 chat:4b"]
    RO -->|lógica| RE["🧠 phi4-mini"]
    C & CO & CH & RE --> RES["📊 Resultado"]

    style Q fill:#172554,stroke:#f97316,color:#e2e8f0
    style C fill:#7f1d1d,stroke:#ef4444,color:#fecaca
    style RO fill:#1e293b,stroke:#06b6d4,color:#e2e8f0
    style CO fill:#14532d,stroke:#22c55e,color:#dcfce7
    style CH fill:#1e3a8a,stroke:#3b82f6,color:#dbeafe
    style RE fill:#4c1d95,stroke:#8b5cf6,color:#ede9fe
```

- **Crítico/seguridad/producción** → modelo cloud completo
- **Código mecánico** → `coder:3b` (local)
- **Explicaciones** → `chat:4b` (local)
- **Lógica/razonamiento** → `phi4-mini` (local)

> ⚠️ Los modelos locales siempre se tratan como **datos no confiables**: nunca ejecutan tools ni acceden a secretos por su cuenta.

---

## 🧩 Componentes

**Plugins esenciales** (`plugins/`): `guardrails.js` (anti-loop), `checkpoints.js` (snapshots), `validator.js` (API keys), `session-metrics.js` (métricas), `organic-rdd.js` (review por riesgo).

**Plugins opcionales** (`plugins-optional/`, pendientes de hardening): `personalities.js`, `kanban.js`, `sandbox.js`, `auto-memory.js`.

**Retirado**: `memory-v2.js` (incompatible con Bun). Reemplazado por `memory-adapter` MCP (`node:sqlite`, sin deps externas). MCP read-only; escrituras solo vía CLI explícita.

**MCP servers** (`mcp/`): `local-model-router` (Ollama, activo por defecto), `memory-adapter` (memoria persistente, work), `context7` (docs de librerías, work), `diagram-generator` (Draw.io/Mermaid, work), `playwright` (off por defecto).

---

## 🛡️ Seguridad

- `.env` y `node_modules/` nunca se suben
- `memory.db` y `kanban.json` sí se suben (estado portable)
- Modelos locales tratados como datos no confiables
- Agentes con permisos de escritura restringidos por defecto

---

## 📂 Estructura

```
opendotfile/
├── agents/                  # 16 agentes activos (symlinks)
├── agents-library/          # 233 agentes disponibles
├── skills/                  # 21 skills SDD + utilidades
├── plugins/                 # 5 esenciales (siempre activos)
├── plugins-optional/        # 4 opcionales por perfil
├── plugins-disabled/        # hooks.js, memory-v2.js
├── mcp/                     # 5 servidores MCP
├── lib/                     # organic-rdd.js y helpers
├── hooks/                   # git gate pre-commit
├── tests/                   # 9 suites
├── profiles/                # work / personal / light
├── spec/features/           # 9 features SDD (001-009)
├── commands/                # /spec, /review-validate, ...
├── AGENTS.md                # reglas globales del agente
├── install.sh               # instalador portátil
└── opencode.jsonc           # config central
```

---

<div align="center">
  <sub>Configuración portátil de OpenCode · Optimizada para ahorro de tokens</sub>
</div>
