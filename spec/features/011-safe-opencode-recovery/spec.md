# Feature 011: Safe OpenCode Recovery

## Problema

El backup automatico trato `~/.config/opencode` como fuente completa y elimino
del repositorio cualquier componente ausente en una instalacion minima. El
commit `741d0b3` retiro configuracion, plugins, agentes, comandos, perfiles,
MCP, tests y gates que estaban presentes en `3ea3042`.

La instalacion activa arranca, pero no representa el sistema documentado y los
wrappers de perfiles apuntan a archivos inexistentes.

## Objetivo

Recuperar una configuracion OpenCode minima, verificable y compatible con
OpenCode 1.18.14, impedir que el backup vuelva a borrar la fuente canonica y
restaurar capacidades por bloques con rollback seguro.

## Alcance

- Convertir `opendotfile` en fuente canonica y la config activa en despliegue.
- Sustituir el backup destructivo por verificacion de drift y export explicito.
- Recuperar config, skills, agentes seleccionados, comandos, perfiles y plugins
  esenciales desde `3ea3042`, migrandolos a la API actual.
- Recuperar `local-model-router` y `memory-adapter` con tests.
- Retirar definitivamente `memory-v2` y datos historicos del runtime.
- Validar primero en un HOME temporal y desplegar solo si todos los gates pasan.
- Actualizar documentacion y kanban al estado real.

## Fuera De Alcance

- Recuperar los 233 agentes historicos.
- Reactivar lifecycle hooks antiguos, `cheap-llm`, `sandbox` o auto-memory.
- Importar bases de datos de memoria historicas.
- Configurar o mostrar API keys.
- Hacer commit o push automaticamente.

## Criterios De Aceptacion

- AC-1: El timer destructivo queda deshabilitado durante la recuperacion.
- AC-2: El backup aborta ante una config minima/incompleta, soporta dry-run, no
  usa `git add -A` y no hace push automatico.
- AC-3: El instalador despliega solo artefactos permitidos, preserva `.env`,
  crea backup y soporta verificacion aislada.
- AC-4: Config base y perfiles pasan `opencode debug config` en 1.18.14.
- AC-5: Skills custom, agentes seleccionados y comandos SDD son descubribles.
- AC-6: Plugins esenciales pasan sus tests y no leen/copien secretos.
- AC-7: Organic RDD se recupera como unidad y sus tests pasan antes del hook.
- AC-8: Router local y memory-adapter pasan tests; memoria usa `node:sqlite`.
- AC-9: `memory-v2`, bases historicas y plugins inseguros no quedan activos.
- AC-10: La suite completa y smoke tests pasan antes de desplegar.
- AC-11: README, runbook, AGENTS y kanban describen el estado final real.
- AC-12: Ningun `.env`, token o base privada se agrega al candidato.

## Riesgo

Tier 3: configuracion central, plugins, persistencia, permisos y gates.
