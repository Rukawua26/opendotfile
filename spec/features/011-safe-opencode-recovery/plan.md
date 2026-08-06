# Plan

## Estrategia

La recuperacion sera selectiva. `3ea3042` es referencia historica, no un
candidato que pueda instalarse literalmente. Cada bloque se migra, prueba y
habilita antes de continuar.

## Fases

1. Contener el timer y respaldar la instalacion activa.
2. Endurecer backup e instalador con tests en directorios temporales.
3. Recuperar config, comandos, agentes y plugins esenciales.
4. Alinear dependencias y schema con OpenCode 1.18.14.
5. Recuperar perfiles y wrappers.
6. Recuperar router y memory-adapter; retirar memoria legacy.
7. Instalar en HOME temporal y ejecutar todos los gates.
8. Desplegar a la config activa, reiniciar tecnicamente y ejecutar smoke tests.
9. Actualizar documentacion y estado del kanban.

## Decisiones

- `opendotfile` es la fuente canonica; no se refleja runtime hacia Git.
- El job programado solo detectara drift y nunca modificara Git.
- `memory-adapter` sustituye a `memory-v2` porque usa `node:sqlite` sin deps.
- Se recupera solo la seleccion activa de agentes.
- Plugins opcionales permanecen fuera hasta una feature de hardening separada.
- El despliegue se realiza desde staging y preserva `.env` fuera del candidato.

## Verificacion

- Schema/config: `opencode debug config` para base, work, personal y light.
- JavaScript: `node --check` y `node --test`.
- Shell: `bash -n` y tests de backup/instalador.
- MCP: tests del router y memory-adapter con datos temporales.
- Runtime: listado de agentes/MCP y smoke runs sin secretos.
- Seguridad: busqueda de `.env`, DB, tokens y artifacts historicos en el diff.

## Rollback

No usar `git reset`. Conservar el backup pre-recovery de la config activa y
restaurarlo mediante intercambio de directorios si falla el smoke test. En Git,
crear cambios correctivos normales; no reescribir historia.
