# Salida Silenciosa De Metricas

## Objetivo

Evitar que los resumenes JSON de tokens, coste y modelos contaminen la salida
visual de la terminal al finalizar una respuesta, manteniendo las metricas
persistentes y una forma explicita de imprimirlas cuando se soliciten.

## Caso De Uso

El usuario usa OpenCode en una terminal y quiere que la interfaz muestre solo
la respuesta y los mensajes operativos necesarios. Las metricas deben seguir
disponibles para analisis sin aparecer automaticamente como un objeto JSON.

## Alcance

- Confirmar que `tools/opencode-metrics.js` es el origen de la impresion JSON.
- Hacer silencioso el modo por defecto del resumen de metricas.
- Guardar el resumen en `~/.local/share/opencode/plugins-data/metrics-summary.json`.
- Añadir `--stdout` como opt-in explicito para imprimir JSON en terminal.
- Mantener `session-metrics.jsonl` como fuente detallada de metricas.
- Replicar el cambio en la configuracion activa y el backup versionado.
- Aislar los tests de metricas de los logs de produccion.

## Fuera De Alcance

- No modificar stdout de servidores MCP: es su canal JSON-RPC.
- No modificar el stream nativo de OpenCode sin reproducir primero el origen.
- No cambiar proveedores, modelos, perfiles, RDD ni ruteo local.
- No integrar ni probar Kimi K3.
- No borrar historiales de metricas existentes.

## Limites De Contexto

- Leer solo: `tools/opencode-metrics.js`, tests relacionados, `plugins/session-metrics.js`,
  `injects/`, cron, launchers y scripts que puedan invocar el resumen.
- No leer `.env`, credenciales, node_modules ni historiales completos.
- Si la salida proviene de OpenCode y no del script, actualizar esta spec antes
  de modificar otro componente.

## Fuentes De Verdad

- `tools/opencode-metrics.js` en activo y backup.
- `plugins/session-metrics.js` y `lib/session-metrics.js`.
- `cron-jobs.json`, launchers e injects.
- Esquema oficial de OpenCode.
- Tests Node del proyecto.
- Log de OpenCode solo para evidencia de reproduccion, sin modificarlo.

## Criterios De Aceptacion

1. La ejecucion normal de `node tools/opencode-metrics.js 1` no imprime el
   resumen JSON en stdout.
2. La ejecucion con `--stdout` imprime exactamente un JSON valido del resumen.
3. El modo silencioso actualiza `metrics-summary.json` sin perder el JSONL
   detallado.
4. Una respuesta normal de OpenCode no genera el objeto JSON de metricas en la
   terminal por codigo de esta configuracion.
5. Ningun stdout JSON-RPC de MCP se modifica.
6. Activo y backup tienen el mismo comportamiento y tests equivalentes.
7. Los tests no escriben en `session-metrics.jsonl` de produccion.
8. Sintaxis, tests, `opencode debug config` y RDD pasan.
9. No aparecen referencias a K3, Moonshot ni modelos retirados.

## Riesgos

- Si el objeto procede del runtime nativo de OpenCode, este script no sera el
  origen; se mitigara con evidencia de reproduccion antes de tocar mas codigo.
- Consumidores externos pueden depender del stdout anterior; `--stdout`
  conserva una ruta explicita y documentada.
- Un resumen parcial puede ocultar un fallo de escritura; el script debe salir
  con error si no puede guardar el archivo.

## Preguntas Abiertas

- Ninguna bloqueante. Si la reproduccion demuestra un origen nativo distinto,
  se debe actualizar el plan antes de cambiarlo.
