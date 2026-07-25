---
titulo: "Auditoria Agentes OpenCode"
tipo: opencode
categoria: agentes
tags: [opencode, agentes, auditoria, status/active, area/config]
relacionado: "[[Agentes OpenCode]], [[Runbook Revisar Agentes]]"
ultima-actualizacion: 2026-07-24
---
# Auditoria Agentes OpenCode

> [!info] Propósito
> Matriz de cobertura para detectar solapamientos y agentes obsoletos. Revisar cada 3 meses con [[Runbook Revisar Agentes]].

## Última revisión
- **Fecha:** 2026-07-24
- **Revisor:** inventario activo + @software-architect
- **Hallazgos:** selección operativa reducida de 35 a 16 agentes; roles no activos permanecen disponibles en `agents-library/`.

## Matriz de Cobertura

### Desarrollo
| Agente | Especialidad | Único/Solapa | Último uso |
|--------|-------------|-------------|------------|
| backend-architect | Implementación backend, APIs y persistencia | Solapa parcial con software-architect | — |
| frontend-developer | Implementación frontend accesible y responsive | Único | — |
| minimal-change-engineer | Parches mínimos sin refactor oportunista | Complementa a frontend/backend | — |
| software-architect | Límites, alternativas y trade-offs sistémicos | Solapa parcial con backend-architect | 2026-07-24 |

### Calidad y Seguridad
| Agente | Especialidad | Único/Solapa | Último uso |
|--------|-------------|-------------|------------|
| application-security-engineer | Vulnerabilidades y controles AppSec | Solapa parcial con code-reviewer | — |
| code-reviewer | Bugs, regresiones, mantenibilidad y tests | Solapa parcial con appsec y verifier | — |
| database-optimizer | BD, queries, índices | Único | — |
| verifier | Evidencia independiente, tests y criterios de aceptación | Complementa a code-reviewer | — |

### Producto y Orquestación
| Agente | Especialidad | Único/Solapa | Último uso |
|--------|-------------|-------------|------------|
| ai-matcher | Selección de agente, solo lectura | Único | — |
| product-manager | Alcance, criterios y prioridades | Único | — |
| prompt-engineer | Diseño y evaluación de prompts | Único | — |

### Entrega y Conocimiento
| Agente | Especialidad | Único/Solapa | Último uso |
|--------|-------------|-------------|------------|
| codebase-onboarding-engineer | Mapeo y trazado de repositorios | Único | — |
| devops-automator | CI/CD, infra, cloud | Único | — |
| git-workflow-master | Git, branching | Único | — |
| technical-writer | Documentación técnica | Único | — |

### Diseño
| Agente | Especialidad | Único/Solapa | Último uso |
|--------|-------------|-------------|------------|
| ui-designer | Especificaciones visuales, accesibilidad y responsive | Único en la selección activa | — |

## Solapamientos detectados (⚠️)

| Par | Gravedad | Recomendación |
|-----|---------|---------------|
| code-reviewer ↔ application-security-engineer | Media | code-reviewer cubre correctness y regresiones; appsec se limita a vulnerabilidades y controles. Mantener ambos. |
| code-reviewer ↔ verifier | Media | code-reviewer produce findings; verifier comprueba diff, comandos y criterios con evidencia independiente. Mantener ambos. |
| backend-architect ↔ software-architect | Baja | backend-architect implementa cambios acotados; software-architect compara límites y trade-offs sin editar. Mantener ambos. |

## Decisiones pendientes
- [ ] Completar "Último uso" con métricas verificables en la revisión de 2026-10.
- [ ] Retirar de la selección activa cualquier agente sin uso demostrado; conservarlo en `agents-library/`.

## Historial de revisiones
| Fecha | Cambios |
|-------|---------|
| 2026-07-24 | Inventario alineado con 16 agentes activos; eliminadas filas y solapamientos de agentes no activos |
| 2026-07-13 | Auditoría inicial — matriz creada, 4 solapamientos detectados |
