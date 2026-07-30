# Injects — Extensiones opcionales de config

Los injects son fragmentos de config OpenCode que se activan bajo demanda.
No se cargan automáticamente: se aplican con `opencode-inject apply <nombre>`.

## Injects disponibles

| Archivo | Descripción | Condición |
|---|---|---|
| `01.providers.openai.jsonc` | Usar OpenAI GPT-5.4-mini como modelo | `OPENAI_API_KEY` en `.env` |
| `02.providers.anthropic.jsonc` | Usar Anthropic Claude Sonnet | `ANTHROPIC_API_KEY` en `.env` |
| `03.plugins.sandbox.jsonc` | Activar sandbox Docker | Docker instalado |

## Uso

```bash
# Listar injects disponibles
opencode-inject list

# Aplicar un inject
opencode-inject apply providers.openai

# Revertir
opencode-inject revert providers.openai
```
