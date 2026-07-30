# Feature 006: Safe Adaptive Harness

## Objetivo

Evitar que las advertencias internas de `guardrails.js` alteren los argumentos
de las herramientas o introduzcan salida aleatoria en la terminal, conservando
la deteccion de bucles, llamadas excesivas y resultados vacios.

## Usuario / Caso De Uso

El usuario ejecuta una sesion con muchas llamadas a herramientas o con una
herramienta que devuelve resultados vacios repetidamente. OpenCode debe
registrar la advertencia sin romper el contrato de argumentos de la herramienta
ni contaminar su salida normal.

## Alcance

- Emitir advertencias mediante `output.metadata`.
- Mantener `output.args` sin cambios causados por guardrails.
- Emitir cada advertencia de umbral una sola vez por racha: la advertencia de
  herramienta repetida se rearma al cambiar de herramienta, la de salida vacia
  al recibir una salida valida y la de llamadas totales no se rearma durante la
  sesion.
- Resetear el estado al compactar la sesion.
- Cubrir los contratos con tests deterministas.

## Fuera De Alcance

- Bloquear herramientas o imponer limites duros de tokens.
- Cambiar el conteo de metricas de sesiones.
- Integrar Kimi K3 o modificar proveedores/modelos.
- Rediseñar Organic RDD o los perfiles.

## Limites De Contexto

- Leer solo `plugins/guardrails.js`, su copia activa en `~/.config/opencode/`,
  tests de plugins y la constitucion minima.
- No leer otros plugins salvo que una prueba revele una dependencia.
- Si el cambio requiere ampliar el alcance, actualizar esta spec antes de editar.

## Fuentes De Verdad

- `plugins/guardrails.js` define el comportamiento actual.
- `opencode.jsonc` confirma que el plugin esta activo.
- `@opencode-ai/plugin` define la forma de los hooks, validada por los tests
  existentes.
- `node --test tests/*.test.js` valida el resultado.

## Criterios De Aceptacion

1. Cinco llamadas consecutivas a la misma herramienta producen una advertencia
   en `metadata` y dejan `output.args` exactamente igual.
2. La advertencia de llamadas totales no usa aleatoriedad, aparece una vez al
   alcanzar el umbral y se registra en `metadata`.
3. Tres resultados vacios consecutivos de la misma herramienta producen una
   advertencia en `metadata`, sin prefijar ni reemplazar `output.output`; no se
   repite hasta recibir una salida valida.
4. La compactacion elimina los contadores de la sesion.
5. Los tests existentes y los nuevos pasan.

## Riesgos

- La metadata puede no mostrarse en todas las interfaces; esto es aceptable
  porque el objetivo es no romper herramientas ni ensuciar la terminal.
- El estado es en memoria y se pierde al reiniciar OpenCode, igual que antes.

## Preguntas Abiertas

- Ninguna bloqueante.
