---
name: prompts
description: Plantillas breves y versionadas para tareas recurrentes con presupuesto orientativo por seccion.
---

# Prompt Anatomy

Usa siete secciones y completa solo la informacion necesaria:

```text
ROL: <quien debe actuar>                         [<= 30 tokens]
TAREA: <resultado exacto>                        [<= 50 tokens]
ENTRADA: <datos, contexto y ejemplos>             [<= 200 tokens]
TONO: <registro, idioma y longitud>               [<= 20 tokens]
RESTRICCIONES: <limites y acciones prohibidas>    [<= 50 tokens]
FORMATO: <lista | tabla | json | bullets>         [<= 10 tokens]
CALIDAD: <criterios comprobables>                  [<= 10 tokens]
```

Los presupuestos son orientativos; no constituyen un limite automatico.

## Plantillas

- `dev/implementar-feature.md`
- `dev/corregir-bug.md`
- `dev/revisar-codigo.md`
- `analisis/resumir-datos.md`
- `analisis/comparar-opciones.md`
- `soporte/responder-cliente.md`

No cargues esta biblioteca por defecto. Selecciona una plantilla cuando la
tarea sea recurrente y sustituye solo los marcadores de `ENTRADA`.
