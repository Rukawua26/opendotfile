# Plan: Safe Adaptive Harness

## Enfoque Tecnico

Modificar el plugin de guardrails para que todas las señales sean metadata
estructurada. Sustituir la condicion aleatoria de llamadas totales por un
marcador de advertencia emitida, y preservar intacta la salida de la
herramienta. Mantener la maquina de estados y sus umbrales actuales.

## Archivos A Tocar

- `plugins/guardrails.js`
- `tests/guardrails.test.js`
- `spec/features/006-safe-adaptive-harness/verify.md`
- `/home/miguel/.config/opencode/plugins/guardrails.js` (copia activa)

## Datos, APIs Y Configuracion

- Hook `tool.execute.before`: solo actualizara estado y dejara la advertencia
  pendiente; el contrato solo permite modificar `output.args`.
- Hook `tool.execute.after`: escribira `output.metadata` y no modificara
  `output.output`.
- Hook `event`: limpiara el estado en `session.compacted` y `session.deleted`.
- No se cambian esquemas de herramientas, perfiles ni configuracion JSONC.

## Dependencias

- Node.js integrado.
- API de plugins ya usada por el repositorio.

## Estrategia De Testing

- Test unitario del plugin: argumentos intactos y metadata de bucle.
- Test unitario: advertencia de total determinista y una sola vez.
- Test unitario: advertencia de salida vacia sin mutar texto.
- Test unitario: reset tras `session.compacted`.
- Suite completa: `node --test tests/*.test.js`.
- Sintaxis: `node --check plugins/guardrails.js`.

## Verificacion Contra Alucinaciones

- Confirmar que cada archivo listado existe antes de editarlo.
- Confirmar que cada tipo/schema usado coincide con el codigo real.
- Confirmar que no se agrega comportamiento fuera de los criterios de aceptacion.
- Confirmar con build, typecheck, tests o lectura post-cambio segun aplique.

## Riesgos Tecnicos

- Cambiar de salida visible a metadata puede reducir visibilidad en clientes que
  no rendericen metadata; se prioriza la integridad del contrato de herramientas.
- El limite de tres iteraciones por tarea es el maximo permitido para corregir
  fallos de tests antes de documentar un bloqueo.

## Maximo De Iteraciones

- Cada tarea de implementacion: 3 iteraciones.
