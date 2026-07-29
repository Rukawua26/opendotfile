# Plan: Token-Efficient Agent Control

## Approach

Hibrido: skills + commands + upgrade minimo de plugin existente.

### Componentes

1. **Skill `token-efficient-control`**: Markdown con YAML frontmatter que define los 3 modos de esfuerzo y reglas de contexto
2. **Command `effort`**: Template de comando OpenCode para `/effort` que el agente sigue
3. **Command `execute-verified`**: Template para `/execute-verified` con flujo implementar + verificar + reportar
4. **Upgrade `session-metrics.js`**: Agregar campos de eficiencia sin romper el schema existente

### Archivos a crear

- `skills/token-efficient-control/SKILL.md` (~40 lines)
- `commands/effort.md` (~30 lines)
- `commands/execute-verified.md` (~30 lines)

### Archivos a modificar

- `lib/session-metrics.js` - agregar campos efficiency
- `plugins/session-metrics.js` - agregar tracking de reads_broad, effort_mode
- `opencode.jsonc` - registrar nuevos commands/skills si aplica

### Testing strategy

- Tests unitarios para lib/session-metrics.js mejorado
- Tests de integracion para plugin session-metrics con nuevos campos
- Verificar que metricas viejas no se rompen
