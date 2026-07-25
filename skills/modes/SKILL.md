---
name: modes
description: Selecciona el grupo minimo de skills para chat, operacion, construccion o verificacion.
---

# Modes

Declara un modo al inicio cuando la tarea no sea obvia. El modo orienta la
primera skill sin cargar todas las demas.

## mode:chat

Para lectura, busqueda y analisis sin editar codigo.

- `explore`: buscar codigo local.
- `scout`: consultar dependencias externas.
- `inbox-triage`: clasificar notas.
- `obsidian-cli`: operar el vault.
- `defuddle`: extraer contenido web limpio.

## mode:operate

Para mantener, diagnosticar u operar un sistema existente.

- `kanban`: gestionar trabajo pendiente.
- `local-model-router`: delegar subtareas locales acotadas.
- `debug-bugs`: reproducir y corregir defectos.
- `security-review`: revisar riesgos concretos.

## mode:build

Para construir una feature nueva.

1. `sdd-specify`
2. `sdd-plan`
3. `sdd-tasks`
4. `sdd-implement`
5. `tdd-workflow` cuando la logica sea critica
6. `json-canvas` cuando una visualizacion aporte valor

## mode:verify

Para comprobar una implementacion antes de integrarla.

- `verifier`: validar criterios y pruebas.
- `code-reviewer-v2`: buscar regresiones y defectos.
- `security-review`: comprobar seguridad.
- `loop-engineering`: revisar iteraciones complejas.

## Regla de ahorro

Carga solo la skill necesaria para la siguiente accion. Los modos son un mapa,
no un paquete de skills que deban cargarse juntas.
