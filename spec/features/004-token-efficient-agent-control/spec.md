# Token-Efficient Agent Control

## Objetivo

Reducir el consumo de tokens en OpenCode mediante modos de esfuerzo configurables, verificacion obligatoria antes de reportar completado, y metricas de eficiencia que midan el comportamiento real del agente.

## Usuario / Caso De Uso

- Usuario que quiere tareas pequenas sin cargar contexto amplio ni subagentes
- Usuario que quiere que el agente verifique con un comando real antes de decir "terminado"
- Usuario que quiere metricas de eficiencia para detectar loops y uso excesivo de herramientas

## Alcance

- **Reasoning effort modes**: perfiles `low`, `medium`, `max` como comando `/effort`
- **Context budget rules**: reglas de que leer segun el modo de esfuerzo
- **Verifier-in-the-loop**: skill y comando `/execute-verified` que exige verificador antes de reportar completado
- **Session metrics upgrade**: agregar metricas de eficiencia a `session-metrics.js`

## Fuera De Alcance

- No implementar sandbox persistente
- No implementar visual verification workflow
- No implementar knowledge graph synthesis
- No implementar cost-aware routing automatico
- No modificar `guardrails.js` (se mantiene separado)

## Limites De Contexto

- Leer solo: `lib/session-metrics.js`, `plugins/session-metrics.js`, `skills/`, `commands/`, `opencode.jsonc`
- No leer: otras features, docs de arquitectura no relacionados

## Fuentes De Verdad

- Skill format existente: `skills/debug-bugs/SKILL.md`
- Command format existente: `commands/handoff.md`
- `lib/session-metrics.js` y `plugins/session-metrics.js` existentes
- `opencode.jsonc` para registro de skills/commands

## Criterios De Aceptacion

- AC-1: Comando `/effort low` existe y establece reglas de contexto minimo
- AC-2: Comando `/effort medium` existe como default sensato
- AC-3: Comando `/effort max` existe para tareas complejas
- AC-4: Skill `token-efficient-control` explica los modos y cuando usar cada uno
- AC-5: Comando `/execute-verified` exige objetivo + comando verificador
- AC-6: El agente no reporta "completado" si el verificador no paso
- AC-7: `session-metrics.js` registra: tools, delegaciones, compactions, effort mode
- AC-8: Las metricas nuevas no rompen metricas existentes

## Riesgos

- Riesgo: effort modes solo son guias, no enforcement real. Mitigado: es intencional para mantener flexibilidad.
- Riesgo: execute-verified puede alargar tareas simples. Mitigado: es opcional, no obligatorio.

## Preguntas Abiertas

- Ninguna
