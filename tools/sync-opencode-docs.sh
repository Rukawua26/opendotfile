#!/bin/bash
# sync-opencode-docs.sh — Sincroniza notas de ~/docs/opencode/ al repo opendotfile
# Ejecutar tras cambios en documentación de OpenCode dentro del vault Obsidian
# También se llama desde el script principal de backup si hay cambios

set -euo pipefail

VAULT_DOCS="$HOME/docs/opencode"
BACKUP_DOCS="$HOME/opendotfile/docs/opencode"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

echo "[$TIMESTAMP] Syncing OpenCode docs from vault to backup repo..."

# Copiar las notas sin borrar previamente el destino.
mkdir -p "$BACKUP_DOCS"
cp -a "$VAULT_DOCS/." "$BACKUP_DOCS/"

# Verificar cambios, incluidos archivos nuevos no rastreados.
cd "$HOME/opendotfile"
if [ -z "$(git status --porcelain -- docs/opencode/)" ]; then
    echo "[$TIMESTAMP] Sin cambios en docs/opencode/ — sync innecesario"
    exit 0
fi

# Stage y commit solo los docs
git add docs/opencode/
COMMIT_MSG="sync(opencode-docs): actualizadas notas de configuración OpenCode desde vault Obsidian ($TIMESTAMP)"
if git commit -m "$COMMIT_MSG"; then
    echo "[$TIMESTAMP] Commit creado: $COMMIT_MSG"
else
    echo "[$TIMESTAMP] Nada que commitear (posiblemente ya sincronizado)"
fi

echo "[$TIMESTAMP] Sync completado."
