---
description: Declara el modo de esfuerzo para la sesion actual: low, medium (default) o max.
---

# Effort Control

Declara el modo de esfuerzo para esta sesion. El comando orienta el trabajo y
queda registrado en las metricas; no cambia el proveedor ni reconfigura una
sesion ya iniciada.

Input: `/effort <mode>`

Modes:

- **low**: usar `opencode-profile` y seleccionar `light` antes de iniciar. Modelo pequeno, sin subagentes, lecturas acotadas.
- **medium** (default): usar el perfil `personal`. Modelo equilibrado, lecturas dirigidas y delegacion limitada.
- **max**: usar `opencode-work` antes de iniciar. Modelo cloud completo, mas pasos y verificacion para arquitectura, seguridad, migraciones y features complejas.

Reglas:
- El modo se fija al inicio de la sesion; para cambiar de perfil, iniciar una nueva sesion.
- El agente debe ajustar su comportamiento al modo declarado, pero no afirmar que existe un limite duro si el runtime no lo impone.
- En modo `low`, el agente debe preguntar antes de hacer lecturas amplias.
- En modo `max`, el agente puede usar hasta tres delegaciones y debe justificar si no usa subagentes para tareas complejas.
- No seleccionar ni probar Kimi K3 como parte de estos modos.
