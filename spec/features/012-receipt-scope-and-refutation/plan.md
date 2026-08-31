# Plan

## Decisiones

- Reutilizar `parent_review_id`, `root_review_id`, `attempt`, `findings`,
  `evidence`, `reviewer_id` y `execution_id`; no crear otro almacenamiento.
- Comparar scopes por el conjunto ordenado de `candidate_files[].path`, no por
  bytes. Los bytes cambian porque la correccion es humana.
- Fijar `attempt = 1` para el receipt inicial normal, permitir un successor con
  `attempt = 2` y rechazar cualquier intento fuera de `1..2`.
- Mantener los lenses requeridos generados por el clasificador y agregar
  `refuter` solo como lens capturable opcional.
- Tratar un refuter `fail` o `blocked` como fallo de evidence capturada, igual
  que cualquier otro resultado explicito.

## Implementacion

1. Endurecer la validacion de lineage en `lib/organic-rdd.js`:
   - comparar manifest del hijo y parent;
   - imponer continuidad de `attempt`;
   - aplicar `MAX_LINEAGE_ATTEMPTS = 2`.
2. Ampliar la validacion de lenses para aceptar `refuter` solo en
   `captured_lenses`, no en `required_lenses`.
3. Actualizar `plugins/organic-rdd.js` y `commands/review-capture.md` para la
   superficie de captura opcional.
4. Agregar pruebas unitarias de scope, intentos, monotonicidad, refuter opcional
   y receipt legacy.
5. Verificar sintaxis, tests focalizados y suite completa.

## Verificacion

- `node --check lib/organic-rdd.js plugins/organic-rdd.js`
- `node --test tests/organic-rdd.test.js tests/organic-rdd-plugin.test.js`
- `node --test tests/*.test.js mcp/*.test.js mcp/memory-adapter/tests/*.test.js`
- `bash tests/backup-opencode-config.test.sh`

## Rollback

Restaurar los archivos tocados desde Git o desde el backup creado por el
instalador/configuracion activa. No reescribir historia Git.
