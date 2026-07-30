# Tasks: Harness Eficiente Sin K3

- [x] 1. RED: ampliar las pruebas de metricas para exigir contadores por delta,
  deteccion real de `read`/`filePath`, esfuerzo y resultado.
- [x] 2. GREEN: corregir `plugins/session-metrics.js` y
  `lib/session-metrics.js` sin cambiar el formato JSONL incompatible.
- [x] 3. VERIFY: ejecutar exclusivamente las pruebas de metricas y revisar un
  fixture de salida.
- [x] 4. Identificar la fuente efectiva de `AGENTS.md` y retirar la copia
  redundante sin borrar contenido del usuario.
- [x] 5. Sustituir `gpt-4o-mini` y `gpt-4o` por modelos presentes en el catalogo
  actual en configuracion, injects y agentes auxiliares.
- [x] 6. RED: agregar una comprobacion automatica que rechace referencias a
  modelos invalidos y referencias de Kimi K3 dentro de esta feature.
- [x] 7. GREEN: actualizar configuracion y documentacion para que los perfiles
  conserven solo proveedores aprobados.
- [x] 8. VERIFY: ejecutar `opencode models openai` y `opencode debug config` para
  los cuatro perfiles.
- [x] 9. Definir diferencias efectivas de low, medium y max mediante `model`,
  `variant`, `steps`, `compaction`, `tool_output` y permisos.
- [x] 10. Limitar plugins y MCP opcionales en perfiles economicos, teniendo en
  cuenta la carga automatica global de plugins.
- [x] 11. Añadir tests de inventario o validacion de perfil que comprueben esas
  diferencias sin iniciar proveedores externos.
- [x] 12. Actualizar `commands/effort.md`, `skills/modes/SKILL.md` y
  `skills/token-efficient-control/SKILL.md` para reflejar controles reales y
  escalado explicito.
- [x] 13. Revisar `guardrails.js` y hooks solo para quitar avisos aleatorios o
  reglas inertes; no agregar un presupuesto que OpenCode no pueda imponer.
- [x] 14. Ejecutar la suite Node completa del repositorio y corregir regresiones.
- [x] 15. Sincronizar la configuracion activa con el backup, excluyendo `.env`,
  bases de datos, secretos y `node_modules`.
- [x] 16. Registrar comandos, resultados, riesgos residuales y ausencia total
  de integracion K3 en `verify.md`.
- [x] 17. Reiniciar OpenCode y repetir la validacion efectiva tras el reinicio.
