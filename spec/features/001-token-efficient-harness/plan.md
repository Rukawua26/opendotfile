# Plan Tecnico

## Enfoque Tecnico

Implementar la mejora como una secuencia de cambios pequenos y verificables:

1. Corregir la observabilidad antes de cambiar limites.
2. Eliminar duplicacion de instrucciones y referencias a modelos invalidos.
3. Convertir los perfiles existentes en harnesses diferenciados sin integrar
   Kimi K3.
4. Reducir la superficie de plugins/MCP en perfiles economicos mediante
   configuracion y permisos explicitos.
5. Hacer medible el esfuerzo y el resultado de cada sesion.
6. Mantener verificacion y receipts, con ciclos limitados.

La configuracion activa en `~/.config/opencode/` y su copia en este repositorio
se trataran como dos artefactos sincronizados. Primero se valida el cambio en
la configuracion activa; despues se actualiza el backup sin incluir secretos.

## Fases

### Fase 0: Observabilidad

- Cambiar las metricas para almacenar contadores por mensaje como deltas o
  como estado claramente separado.
- Corregir deteccion de `read` y argumentos `path`/`filePath`.
- Capturar modelo, variante/esfuerzo, perfil, resultado y fallos reales.
- Sustituir tests vacios por aserciones sobre resultados observables.

### Fase 1: Correccion De Configuracion

- Reemplazar `openai/gpt-4o-mini` y `openai/gpt-4o` por modelos existentes,
  preferentemente `openai/gpt-5.4-mini` para agentes auxiliares.
- Revisar la referencia duplicada de `AGENTS.md` y conservar una fuente
  efectiva.
- Alinear la dependencia `@opencode-ai/plugin` con la version del CLI si los
  tests confirman compatibilidad.
- Actualizar injects y documentacion que apunten a modelos retirados.

### Fase 2: Harnesses Por Perfil

- Definir perfiles economico, normal y maximo usando los modelos actuales.
- Usar `steps`, `variant`, `permission`, `compaction` y `tool_output` como
  controles nativos.
- Desactivar MCP y plugins opcionales donde no aporten al perfil.
- Restringir `task` y herramientas de alto coste en perfiles low/personal.
- Mantener Ollama local solo para consultas acotadas y sin secretos.

### Fase 3: Esfuerzo Y Verificacion

- Mantener `/effort` como contrato de seleccion de perfil, no como promesa de
  un presupuesto que OpenCode no aplica nativamente.
- Registrar el modo en la sesion y exigir cambio de sesion para cambios de
  esfuerzo que puedan romper caché o comparabilidad.
- Conservar Organic RDD para Tier 2/3 y limitar rondas de verificacion a tres.
- Añadir una ruta de escalado explicita cuando el perfil carezca de una tool.

### Fase 4: Sincronizacion Y Evidencia

- Ejecutar tests Node y validacion de configuracion por perfil.
- Ejecutar `opencode debug config` y `opencode models` sin exponer secretos.
- Comparar la configuracion activa con el backup.
- Registrar resultados en `verify.md`.

## Archivos A Tocar

### Configuracion activa y backup

- `opencode.jsonc`
- `profiles/work/opencode.jsonc`
- `profiles/personal/opencode.jsonc`
- `profiles/light/opencode.jsonc`
- `~/.local/bin/opencode-work`, `opencode-personal` y `opencode-profile`
- `injects/01.providers.openai.jsonc`
- `AGENTS.md`, solo si se decide una fuente canonica unica

Los mismos artefactos activos bajo `~/.config/opencode/` se actualizaran de
forma sincronizada y no se leeran archivos `.env`.

### Metricas y comportamiento

- `plugins/session-metrics.js`
- `lib/session-metrics.js`
- `plugins/guardrails.js`, solo si el limite aleatorio necesita sustituirse
- `plugins/hooks.js` y `lib/hooks.js`, solo si se habilitan reglas reales
- `commands/effort.md`
- `skills/token-efficient-control/SKILL.md`
- `skills/modes/SKILL.md`

### Tests y documentacion

- `tests/session-metrics.test.js`
- `tests/session-metrics-plugin.test.js`
- `tests/profile-config.test.js`
- tests nuevos acotados para perfiles o resolucion de budgets si hacen falta
- `README.md`
- `docs/opencode/perfiles-opencode.md`
- `docs/opencode/plugins-opencode.md`
- `spec/features/001-token-efficient-harness/verify.md`

## Datos, APIs Y Configuracion

- El esquema de OpenCode es la fuente para `agent.steps`, `agent.variant`,
  `permission`, `compaction`, `tool_output`, `model` y `small_model`.
- Los modelos se validan con `opencode models` y no se hardcodean modelos no
  presentes en el catalogo.
- No se añade Moonshot, `MOONSHOT_API_KEY` ni ningun modelo K3.
- Las metricas siguen siendo JSONL local, sin datos sensibles.
- Los cambios de configuracion requieren reiniciar OpenCode.

## Estrategia De Testing

- `node --test tests/session-metrics.test.js tests/session-metrics-plugin.test.js`
- Tests de parser/configuracion con fixtures pequenos y sin `.env`.
- `opencode debug config` para root, work, personal y light.
- `opencode models openai` para validar modelos auxiliares.
- Verificacion de ausencia de `gpt-4o` y de cualquier referencia K3 en el
  diff de esta feature.
- Lectura post-cambio de cada JSONC y comparacion con el backup.

## Verificacion Contra Alucinaciones

- Confirmar que cada archivo listado existe antes de editarlo.
- Confirmar que cada tipo/schema usado coincide con el codigo real.
- Confirmar que no se agrega comportamiento fuera de los criterios de
  aceptacion.
- Confirmar con tests, `opencode debug config`, `opencode models` y lectura
  post-cambio.
- Tratar las recomendaciones del informe K3 como principios, no como APIs de
  OpenCode.

## Riesgos Tecnicos

- OpenCode carga plugins globales automaticamente; declarar menos plugins en un
  perfil no basta para aislarlo. Se verificara el inventario efectivo.
- El merge de configuracion puede conservar claves globales inesperadas. Se
  inspeccionara siempre la salida de `opencode debug config`.
- El modelo de compaction puede quedar invalidado si se corrige sin probarlo.
- Un limite demasiado bajo puede aumentar reintentos. Se compararan fallos y
  tareas verificadas antes de endurecerlo.
- Actualizar la dependencia del plugin puede producir cambios de API; se hara
  solo con tests y backup.

## Maximo De Iteraciones

- Cada fase admite un maximo de 3 iteraciones de correccion.
- Si una fase no pasa sus verificaciones tras 3 iteraciones, se documenta en
  `verify.md` y se escala al usuario antes de continuar.
