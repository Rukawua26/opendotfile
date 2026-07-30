# Plan Tecnico

## Enfoque

1. Reproducir manualmente el resumen actual y buscar invocaciones automaticas.
2. Cambiar solo `opencode-metrics.js` si la evidencia confirma su stdout como
   origen.
3. Persistir el resumen en un archivo de estado y reservar stdout para
   `--stdout`.
4. Cubrir el contrato CLI con tests aislados en directorios temporales.
5. Sincronizar activo y backup, verificar OpenCode y revisar el candidato.

## Archivos A Tocar

- `tools/opencode-metrics.js`
- `tests/opencode-metrics.test.js` nuevo
- `plugins/session-metrics.js` y su test solo si hace falta aislar la ruta de
  test; no cambiar su comportamiento productivo.
- `README.md` o documentación de métricas si el contrato CLI lo requiere.
- Copias equivalentes en `~/.config/opencode/` y el backup.
- `spec/features/005-silent-usage-output/verify.md`

## Contrato CLI

- `node tools/opencode-metrics.js [days]`: actualiza el resumen y no imprime
  JSON; devuelve exit code 0.
- `node tools/opencode-metrics.js --stdout [days]`: actualiza el resumen e
  imprime un único JSON válido en stdout.
- `OPENCODE_METRICS_FILE`: permite fixtures JSONL sin tocar producción.
- `OPENCODE_METRICS_SUMMARY_FILE`: permite redirigir el resumen en tests o
  instalaciones especiales.

## Datos Y APIs

- Fuente: JSONL existente en `OPENCODE_METRICS_FILE` o su ruta por defecto.
- Destino: `OPENCODE_METRICS_SUMMARY_FILE` o
  `~/.local/share/opencode/plugins-data/metrics-summary.json`.
- Crear directorio con permisos `0700` y archivo con permisos `0600` cuando
  sea necesario.
- No escribir en stdout salvo `--stdout`.

## Testing

- Tests unitarios de parseo, resumen, salida silenciosa y `--stdout`.
- Tests con fixture temporal y resumen temporal.
- `node --check tools/opencode-metrics.js`.
- `node --test tests/*.test.js` en activo y backup.
- `opencode debug config` para root y perfiles.
- Buscar invocaciones automáticas antes y después del cambio.
- Confirmar que MCP conserva sus archivos de transporte sin cambios.

## Verificacion Contra Alucinaciones

- Confirmar que cada archivo listado existe antes de editarlo.
- Confirmar que la forma actual del JSONL coincide con `lib/session-metrics.js`.
- Confirmar mediante captura de stdout que el modo normal es silencioso.
- Confirmar que `--stdout` produce JSON parseable.
- No modificar MCP ni OpenCode nativo sin una reproduccion que lo justifique.
- Confirmar con tests y lectura post-cambio que no se agrego salida indirecta.

## Maximo De Iteraciones

- Maximo 3 iteraciones por tarea.
- Si el origen no es `opencode-metrics.js`, detener la implementacion y
  actualizar esta spec y el plan antes de tocar otro componente.
