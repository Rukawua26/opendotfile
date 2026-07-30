---
titulo: "Obsidian Skills"
tipo: opencode
categoria: skills
tags: [opencode, skills, obsidian, status/active, area/config]
relacionado: "[[OpenCode System]]"
ultima-actualizacion: 2026-07-13
---
# Obsidian Skills

## Resumen
Skills de `kepano/obsidian-skills` instalados en la ruta activa `~/opencode-custom/skills/`, configurada en `opencode.jsonc`. OpenCode los descubre mediante cada archivo `SKILL.md` después de reiniciar.

| Skill | Descripción | Status |
|-------|-------------|--------|
| obsidian-markdown | Crear/editar Obsidian Flavored Markdown (wikilinks, embeds, callouts, properties) | Instalado |
| obsidian-bases | Crear/editar Obsidian Bases (`.base`) con views, filters, formulas | Instalado |
| json-canvas | Crear/editar JSON Canvas (`.canvas`) con nodes, edges, groups | Instalado |
| obsidian-cli | Interactuar con vaults via CLI (plugins, themes) | Instalado |
| defuddle | Extraer markdown limpio de páginas web | Instalado |
| inbox-triage | Clasificar notas del inbox y sugerir destino sin moverlas | Instalado |

## Instalación
El repositorio fuente está en `~/.opencode/skills/obsidian-skills/`; sus cinco skills y `inbox-triage` están copiados a `~/opencode-custom/skills/`, que es la ruta cargada por OpenCode.

## Especificación
Siguen el standard [Agent Skills](https://agentskills.io/specification) — compatibles con Claude Code, Codex y OpenCode.

## Ver también
- [[OpenCode System]]
- [[_MOC]]
