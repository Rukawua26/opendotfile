---
description: Establece el modo de esfuerzo para la sesion actual: low, medium (default) o max.
---

# Effort Control

Establece el modo de esfuerzo para esta sesion.

Input: `/effort <mode>`

Modes:

- **low**: contexto minimo, modelo pequeno, sin subagentes, solo lecturas acotadas. Usar para tareas simples, docs, resumenes, cambios triviales.
- **medium** (default): balance entre contexto y eficiencia. Lecturas dirigidas, subagentes limitados, modelo normal.
- **max**: contexto completo, subagentes, modelo cloud. Usar para arquitectura, seguridad, migraciones, features complejas.

Reglas:
- El modo persiste hasta que se cambie explicitamente.
- Al cambiar de modo, el agente debe ajustar su comportamiento inmediatamente.
- En modo `low`, el agente debe preguntar antes de hacer lecturas amplias.
- En modo `max`, el agente debe justificar si NO usa subagentes para tareas complejas.
