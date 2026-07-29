# Tasks: Token-Efficient Agent Control

## T-001: Crear skill token-efficient-control

Skill que define los 3 modos de esfuerzo con reglas de contexto:

- `low`: resumenes, modelo pequeno, sin subagentes, sin exploracion amplia
- `medium` (default): lecturas dirigidas, subagentes limitados, modelo normal
- `max`: contexto completo, subagentes, modelo cloud, alcance arquitectonico

## T-002: Crear command effort

Template de comando para `/effort low|medium|max` que instruye al agente que modo seguir.

## T-003: Crear command execute-verified

Template de comando para `/execute-verified <objetivo> --verify <comando>`:
- Implementar objetivo
- Ejecutar verificador
- Si falla, corregir y reintentar
- Reportar resultado con evidencia

## T-004: Upgradar lib/session-metrics.js con efficiency fields

Agregar campos opcionales: `reads_broad`, `effort_mode`, `verified`, `loop_detected`

## T-005: Upgradar plugins/session-metrics.js

Agregar tracking de:
- `reads_broad` cuando tool es Read con patrones amplios
- `effort_mode` si se detecta en el contexto de la sesion
- `loop_detected` cuando tools repetidos sin progreso

## T-006: Tests

- Tests para nuevos campos en lib/session-metrics.js
- Tests de integracion para plugin
- Regression: metricas existentes no se rompen

## T-007: Deploy y verificar

- `node --test` full suite
- `./install.sh`
- Verificar en destino
