# Verify — Feature 011: Safe OpenCode Recovery

## Criterios de Aceptacion

| ID | Descripcion | Resultado | Evidencia |
|----|-------------|-----------|-----------|
| AC-1 | Timer destructivo deshabilitado | PASS | `systemctl --user disable --now opencode-backup.timer` ejecutado |
| AC-2 | Backup aborta ante config incompleta, soporta dry-run, no git add -A, no push | PASS | `tests/backup-opencode-config.test.sh` 6/6 |
| AC-3 | Instalador preserva .env y crea backup | PASS | `.env` perms 600; backup creado en `~/.config/opencode.backup.*` |
| AC-4 | Config base y perfiles pasan `opencode debug config` 1.18.14 | PASS | `model: gpt-5.6-sol`, sin ConfigInvalidError |
| AC-5 | Skills, agentes y comandos descubribles | PASS | 15 SKILL.md, 16 agentes, 16 commands en config activa |
| AC-6 | Plugins esenciales pasan tests y no copian secretos | PASS | checkpoints.js excluye .env/DB; 39 tests guardrails/metrics |
| AC-7 | Organic RDD recuperado como unidad | PASS | 87 tests organic-rdd pasan |
| AC-8 | Router y memory-adapter pasan tests; node:sqlite | PASS | 21 router + 22 memory-adapter tests |
| AC-9 | memory-v2 y bases historicas no activas | PASS | no plugins-disabled/memory-v2.js en runtime |
| AC-10 | Suite completa y smoke tests pasan | PASS | 172 Node + 6 shell = 178/178 |
| AC-11 | README, AGENTS y kanban describen estado real | PASS | conteos corregidos, memory-adapter documentado |
| AC-12 | Ningun .env, token o base privada en el candidato | PASS | .gitignore excluye .env; backups no versionados |

## Verificacion Anti-Alucinacion

- `opencode debug config` cargo sin errores en staging y config activa.
- `opencode --version` confirma 1.18.14.
- `npm ls` confirma @opencode-ai/plugin 1.18.14 y @modelcontextprotocol/sdk 1.30.0.
- 16 agentes symlinks resuelven sin broken.
- `.env` perms 600 tras instalador corregido.

## Comandos Ejecutados

- `node --test tests/*.test.js mcp/*.test.js mcp/memory-adapter/tests/*.test.js` → 172 pass
- `bash tests/backup-opencode-config.test.sh` → 6 pass
- `opencode debug config` → sin ConfigInvalidError
- `node --version` → v26.5.1

## Reality-Check

REALITY-CHECK: AUTO-APPROVED
Reason: Suite completa pasa, config valida contra schema 1.18.14, staging y despliegue verificados.
Findings: 0 CRITICAL / 0 HIGH / 0 WARN
