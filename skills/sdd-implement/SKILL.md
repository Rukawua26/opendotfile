---
name: sdd-implement
description: Implement an approved project-local SDD feature task by task and verify it against its acceptance criteria.
---

# SDD Implement

Implementa siguiendo `spec.md`+`plan.md`+`tasks.md` como ancla de verdad. Reglas transversales y
plantillas en `../sdd-phase-common.md`.

## Trigger
- Existen `spec.md`, `plan.md`, `tasks.md`; usuario pide implementar (`/implement-spec`, `SDD implement`).

## Prompt Engineering obligatorio (5 ejes)
- Rol: especialista del stack.
- Contexto: solo constitución mínima + feature + archivos de `plan.md`.
- Tarea: completa `tasks.md` una por una.
- Restricciones: no amplíes alcance, no refactorices fuera del plan, no leas archivos innecesarios, no inventes.
- Formato: progreso en `tasks.md`, verificación en `verify.md`, reporte al final.

## Contexto permitido
Lee solo: `spec/constitution/{working-agreement,tech-stack}.md`,
`spec/features/<feature>/{spec,plan,tasks}.md`, y archivos de código directamente necesarios. No otras features.

## Flujo
0. **Entender**: lee `spec.md` completo una vez; valida alcance. Sin código.
1. **Preparar**: confirma criterios; marca progreso.
2. **Implementar por tarea**: cambio mínimo correcto; sin refactor fuera de plan; actualiza `tasks.md`.
2.4 **TDD opcional** (si plan/usuario lo pide): RED → GREEN → REFACTOR → VERIFY.
2.5 **Loop auto-correctivo**: máx 3 iter/tarea; tras 3 fallos, bloqueante en `verify.md`.
2.6 **Anti-alucinación** (obligatorio antes de cerrar): lee archivos modificados, compara con
   spec/plan/tasks, verifica tipos/imports/APIs reales; corrige lo inventado.
3. **Verificar**: checks de `plan.md`; registra en `verify.md` (sección anti-alucinación).
3.5 **Cross-Review**: subagente `code-reviewer-v2` con contexto limpio (`git diff` + spec/plan/tasks +
   tech-stack); CRITICAL→corregir y repetir; HIGH→documentar; escala a multi-agent si 3+ capas.
3.6 **Reality-Check Gate**: PASS+sin CRITICAL/HIGH → AUTO-APPROVE; CRITICAL → pausar/corregir;
   HIGH → riesgo residual para humano; WARN/INFO → observaciones. Registro en `verify.md`.
4. **Cerrar**: resume archivos, criterios validados, comandos.

## Restricciones (específicas)
- No implementes features fuera de la spec; no ignores criterios fallidos; no ocultes fallos de test.

## Output
```
SDD IMPLEMENTATION COMPLETE
Feature: spec/features/NNN-name/
Tasks completed: X/Y
Verification: PASS/FAIL
Comandos ejecutados: ...
Archivos modificados: ...
```
