---
name: sdd-phase-common
description: Reglas transversales compartidas por las fases SDD (specify/plan/tasks/implement). No invocar directamente; la referencian las fases.
---

# SDD — Reglas Comunes (compartidas por todas las fases)

Aplica a `sdd-specify`, `sdd-plan`, `sdd-tasks`, `sdd-implement`. Cada fase tiene su propio
SKILL con lo único de esa fase; aquí solo lo transversal, para no duplicar instrucciones
(reduce el coste de tokens por ciclo SDD).

## Principios transversales
- **Specs locales**: todo vive en `./spec/` del proyecto actual. Nunca uses una carpeta global de specs.
- **Lee solo lo mínimo**: constitución mínima + feature solicitada + archivos listados en `plan.md`.
  No leas otras features salvo dependencia explícita.
- **Verificación contra la realidad**: no afirmes comportamiento, tipos, imports, nombres de archivo
  ni APIs sin confirmarlos en el código real (build/typecheck/tests/lectura post-cambio).
- **No implementes código** durante las fases de especificación/plan/tasks.
- **Límites de contexto**: cada artefacto declara qué leer y qué NO leer (evita inflar tokens).
- **Fuentes de verdad**: todo artefacto lista fuentes verificables (schemas, archivos existentes,
  AGENTS.md, comandos de build/test).

## Plantillas reutilizables

### Limites De Contexto
```md
## Limites De Contexto
- Leer solo: [archivos/directorios necesarios]
- No leer: [directorios que aumentan tokens sin aportar]
- Si la implementacion requiere mas contexto, actualizar esta seccion antes de continuar.
```

### Fuentes De Verdad
```md
## Fuentes De Verdad
- [Tipos/schemas/contratos que validan datos]
- [Archivos existentes que definen comportamiento]
- [Docs o AGENTS.md relevantes]
- [Comandos de build/test que validan el resultado]
```

### Verificacion Contra Alucinaciones
```md
## Verificacion Contra Alucinaciones
- Confirmar que cada archivo listado existe antes de editarlo.
- Confirmar que cada tipo/schema usado coincide con el codigo real.
- Confirmar que no se agrega comportamiento fuera de los criterios de aceptacion.
- Confirmar con build, typecheck, tests o lectura post-cambio segun aplique.
```

### Condiciones De Salida Del Loop
- Máx de iteraciones por tarea (default: 3). Si no cabe, documentar en `verify.md` y escalar al humano.

## Formato de salida (envelope)
Cada fase termina con un bloque:
```
SDD <PHASE> CREATED
Feature: spec/features/NNN-name/
...campos especificos de la fase...
Proximo paso: <siguiente fase>
```

## Anti-alucinacion (obligatorio antes de cerrar)
- Confirma que cada archivo listado existe antes de editarlo.
- Confirma que tipos/schemas coinciden con el código real.
- No agregues comportamiento fuera de los criterios de aceptación.
- Registra evidencia en `verify.md` (sección `Verificación Anti-Alucinación`).
