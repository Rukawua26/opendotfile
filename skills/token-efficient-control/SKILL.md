---
name: token-efficient-control
description: Controla el esfuerzo y contexto del agente con modos low, medium, max para ahorrar tokens
type: prompt
whenToUse: Cuando el usuario especifica /effort o cuando la tarea puede resolverse con contexto minimo
arguments:
  - mode
---

# Token-Efficient Agent Control

Elige el modo segun la tarea:

## Effort Low

**Cuando**: Tareas simples, documentacion, busqueda puntual, cambios triviales, resumen.

**Reglas**:
- Usa modelo pequeno (no cloud)
- Prefiere summaries y repo-map sobre lectura directa
- No subagentes
- No exploracion amplia (Glob/Grep con patrones acotados)
- No leer directorios completos
- Si necesitas mas contexto, consulta primero si es necesario
- Compacta temprano si la sesion crece
- Anti-relectura: no vuelvas a leer el mismo rango de archivo si no cambio;
  mas de 5 lecturas repetitivas/anchas → delega a `explore` con tarea acotada.

## Effort Medium (default)

**Cuando**: Bugs normales, features acotadas, cambios en 1-2 archivos, refactors locales.

**Reglas**:
- Modelo normal segun config
- Lecturas dirigidas a archivos relevantes (1-3 antes de delegar)
- Subagentes solo si la tarea lo justifica
- Prefiere `query_context.py` sobre leer arboles completos
- Carga contexto de otras features solo si hay dependencia explicita

## Effort Max

**Cuando**: Arquitectura, seguridad, migraciones, runtime critico, features que cruzan 3+ capas.

**Reglas**:
- Modelo cloud completo
- Contexto completo del proyecto
- Subagentes permitidos (explore + verifier)
- Lectura de archivos completa
- Usa Organic RDD si los cambios son Tier 2+
- Usa multiagente si cruza backend+frontend+infra

## Umbrales de sesion

- A los 20 tools: revisa el enfoque (advertencia).
- A los 50 tools: considera compactar o subdividir (advertencia).
- A los 100 tools: divide la tarea en sesiones mas cortas (advertencia).
- Profundidad maxima de subagentes anidados: 1.
- `preserve_recent_tokens` protege el cierre post-compactacion.

## Output Esperado

```
Effort mode: low|medium|max
Reason: <por que este modo>
Context loaded: <que se leyo y que no>
Tokens saved estimate: <aproximacion>
```
