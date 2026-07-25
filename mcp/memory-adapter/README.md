# opencode-memory-adapter

Universal memory adapter with SQLite + MCP server. Works with any AI coding agent that supports MCP: OpenCode, Claude Code, Cursor, Codex, VS Code Copilot, etc.

## Installation

```bash
npm install -g opencode-memory-adapter
```

Or via ecosystem install:

```bash
curl -sSL https://raw.githubusercontent.com/Rukawua26/opencode-ecosystem/main/install.sh | bash
```

## MCP Configuration

Add to your agent's MCP config:

### OpenCode (`~/.config/opencode/opencode.jsonc`)
```jsonc
{
  "mcp": {
    "memory-adapter": {
      "type": "local",
      "command": ["node", "~/.config/opencode/mcp/memory-adapter/src/mcp-server.js"],
      "enabled": true
    }
  }
}
```

### Claude Code (`.claude/settings.json`)
```json
{
  "mcpServers": {
    "memory-adapter": {
      "command": "node",
      "args": ["~/.config/opencode/mcp/memory-adapter/src/mcp-server.js"]
    }
  }
}
```

### Cursor (`.cursor/settings.json`)
```json
{
  "mcpServers": {
    "memory-adapter": {
      "command": "node",
      "args": ["~/.config/opencode/mcp/memory-adapter/src/mcp-server.js"]
    }
  }
}
```

## MCP Tools (read-only)

| Tool | Description |
|---|---|
| `search_memory` | Search past decisions, bugs, architecture (text-based) |
| `search_memory_semantic` | Search using semantic embeddings (requires Ollama) |
| `get_context` | Get recent context for a project (use at session start) |
| `get_history` | Get session history log |
| `export_project` | Return shareable, non-private decisions as JSON |

MCP is intentionally read-only. Persistent writes require an explicit local
CLI command so model output cannot poison future sessions without approval.
The server binds reads to `OPENCODE_PROJECT_ROOT` (or its startup directory)
and derives a path-specific project identity, preventing cross-project reads.

## CLI Commands

```bash
# Initialize database
memory-adapter init

# Save an approved decision
memory-adapter save-decision --title "Use SQLite" --content "Local-first storage"

# Save an approved bug fix
memory-adapter save-bug --title "Timeout" --description "Request timed out" --fix "Add timeout handling"

# Export to JSON
memory-adapter export --path /path/to/project

# Import from JSON (replaces the target project's existing memory)
memory-adapter import --file memory-export.json

# Safe sync outside the repository (non-private decisions only)
memory-adapter sync --path /path/to/project

# Explicit team export with operational records
memory-adapter export --path /path/to/project --include-operational --out ./memory-export.json

# Export to Obsidian Markdown
memory-adapter export-obsidian --out ./docs/decisions

# Check status
memory-adapter status
```

## Philosophy

- **Structured memory, not chat dumps**: Only saves decisions, bugs, architecture, preferences
- **Token efficient**: AI loads context on-demand via search, not everything at once
- **Local-first**: SQLite database on your machine, no cloud required
- **Privacy aware**: `isPrivate` flag for decisions that may contain secrets
- **Universal**: Any MCP-compatible agent can use it

## License

MIT
