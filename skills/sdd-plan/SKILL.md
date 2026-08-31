---
name: sdd-plan
description: Produce a technical implementation plan from an approved project-local feature specification without changing code.
---

# SDD Plan

Convierte `spec.md` existente en plan técnico local. Reglas transversales y plantillas en
`../sdd-phase-common.md`.

## Cuándo usar / Trigger
- Existe `spec/features/<feature>/spec.md` y el usuario pide planificar.

## Contexto permitido
Lee solo: `spec/constitution/working-agreement.md`, `spec/constitution/tech-stack.md`,
`spec/features/<feature>/spec.md`. No otras features.

## Flujo
1. **Validar entrada**: confirma `spec.md`; si hay preguntas bloqueantes, pregunta.
2. **Inspección mínima**: Glob/Grep dirigido; solo archivos del alcance.
3. **Crear `plan.md`**: enfoque técnico, archivos a tocar, datos/APIs/config, dependencias,
   estrategia de testing, verificación anti-alucinación, riesgos, criterios de decisión.
4. **Verificación contra alucinaciones** + **condiciones de salida del loop** (máx 3 iter/tarea).
   Plantillas en `../sdd-phase-common.md`.

## Restricciones (específicas)
- No implementes código durante Plan.
- No amplíes alcance de `spec.md` sin actualizarla primero.
- No planifiques sobre APIs/tipos/archivos no verificados en código real.

## Output
```
SDD PLAN CREATED
Feature: spec/features/NNN-name/
Plan: spec/features/NNN-name/plan.md
Archivos previstos: X
Riesgos: X
Próximo paso: crear tasks con sdd-tasks
```
