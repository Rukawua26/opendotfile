# OpenCode Context

General workspace rules inherit from `__HOME__/AGENTS.md`.

OpenCode-specific notes:

- Active config: `~/.config/opencode/`.
- Essential auto-loaded plugins live in `plugins/`.
- Optional plugins live in `plugins-optional/` and are enabled by profiles.
- Disabled plugins live in `plugins-disabled/`.
- Restart OpenCode after changing config, plugins, commands or skills.
- Never read or expose `.env` files or credentials.
