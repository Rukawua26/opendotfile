---
titulo: "Agentes OpenCode"
tipo: opencode
categoria: agentes
tags: [opencode, agentes, config, status/active, area/config]
relacionado: "[[OpenCode System]], [[OpenCode Config]]"
ultima-actualizacion: 2026-07-24
---
# Agentes OpenCode

## Sistema de Agentes
Dos niveles de agentes en el ecosistema OpenCode:

### 1. Agentes Activos (16)
Selección operativa para uso diario. `agents/` contiene symlinks hacia los agentes elegidos de `agents-library/`.

| Agente | Función |
|-------|---------|
| ai-matcher | Selección de agente especializado, solo lectura |
| application-security-engineer | Seguridad de aplicaciones |
| backend-architect | Arquitectura backend |
| code-reviewer | Revisión de bugs, regresiones y riesgos |
| codebase-onboarding-engineer | Exploración dirigida de repositorios |
| database-optimizer | Optimización BD |
| devops-automator | CI/CD e infraestructura |
| frontend-developer | Implementación frontend |
| git-workflow-master | Git y branching |
| minimal-change-engineer | Diffs mínimos |
| product-manager | Gestión de producto y alcance |
| prompt-engineer | Optimización prompts |
| software-architect | Límites, alternativas y trade-offs de arquitectura |
| technical-writer | Documentación técnica |
| ui-designer | Especificaciones de interfaz y accesibilidad |
| verifier | Verificación independiente de cambios |

### 2. Agentes Library (233)
Curados por división funcional y cargados solo cuando se seleccionan. Ubicados en `agents-library/` dentro del backup.

Divisiones actuales: academic, agency-core, design, engineering, finance, game-development, gis, marketing, paid-media, product, project-management, sales, security, spatial-computing, specialized, strategy, support y testing.

### Índice
- `agents-index.tsv` — índice con slug, división, descripción y tags de los 233 agentes.

## Invocación
En OpenCode: `@nombre-del-agente`

## Ubicación
- Backup: `opendotfile/agents/` y `opendotfile/agents-library/`
- Integración: `~/.config/opencode/agents/`

## Ver también
- [[OpenCode System]]
- [[Plugins OpenCode]]
- [[Agentes Library]]
