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

## Effort Medium (default)

**Cuando**: Bugs normales, features acotadas, cambios en 1-2 archivos, refactors locales.

**Reglas**:
- Modelo normal segun config
- Lecturas dirigidas a archivos relevantes
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

## Output Esperado

```
Effort mode: low|medium|max
Reason: <por que este modo>
Context loaded: <que se leyo y que no>
Tokens saved estimate: <aproximacion>
```
