---
name: sdd-tasks
description: Break an approved SDD plan into ordered, verifiable implementation tasks scoped to the active feature.
---

# SDD Tasks

Divide `plan.md` en tareas atómicas, ordenadas y verificables. Reglas transversales y plantillas
en `../sdd-phase-common.md`.

## Cuándo usar / Trigger
- Existen `spec.md` y `plan.md`; falta `tasks.md`. Usuario pide dividir en tareas
  (`/tasks-spec`, `breakdown`).

## Flujo
1. **Leer**: `spec.md` + `plan.md` de la feature.
2. **Crear `tasks.md`** (formato en `../sdd-phase-common.md`): cada tarea pequeña, ordenada,
   verificable, un cambio claro, TDD cuando aplique (RED/GREEN/REFACTOR/VERIFY).
3. **Crear `verify.md`** si no existe.

## Restricciones (específicas)
- No implementes código durante Tasks.
- No crees tareas vagas ("mejorar código"); si no verificable, reescríbela.

## Output
```
SDD TASKS CREATED
Feature: spec/features/NNN-name/
Tasks: X
Verify file: spec/features/NNN-name/verify.md
Próximo paso: implementar con sdd-implement
```
