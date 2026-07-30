# Tasks: Salida Silenciosa De Metricas

- [x] 1. Reproducir stdout actual de `opencode-metrics.js` con fixture y buscar
  invocaciones automaticas.
- [x] 2. RED: crear tests para modo silencioso, `--stdout`, archivo resumen y
  variables de rutas temporales.
- [x] 3. GREEN: implementar el contrato CLI silencioso en
  `tools/opencode-metrics.js`.
- [x] 4. Ejecutar tests focalizados y corregir solo fallos del contrato.
- [x] 5. Sincronizar el script y tests entre activo y backup.
- [x] 6. Actualizar documentacion de uso explicito de `--stdout`.
- [x] 7. Ejecutar suite completa, sintaxis, configs y busqueda de stdout no
  deseado.
- [x] 8. Capturar review RDD y verificar el candidato. El cambio es un CLI
  cargado por ejecucion, por lo que no requiere reinicio del proceso para
  aplicar el silencio.
- [x] 9. Confirmar en terminal que el modo normal no aparece JSON automatico.
