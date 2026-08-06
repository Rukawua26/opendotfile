#!/usr/bin/env bash
# Drift detector and safe exporter for opendotfile.
# Never mirrors runtime into Git destructively. Never auto-commits/pushes.
set -euo pipefail

BACKUP_REPO="${HOME}/opendotfile"
CONFIG_DIR="${HOME}/.config/opencode"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DRY_RUN=0
STAGE=""
ALLOWED_TOPLEVEL="opencode.jsonc profiles plugins mcp commands agents AGENTS.md .env.example package.json package-lock.json"

usage() {
  echo "Uso: $0 [--dry-run] [--stage DIR]"
  echo "  --dry-run       Solo reporta drift, no copia nada."
  echo "  --stage DIR     Exporta artefactos permitidos a DIR sin tocar Git."
  exit 0
}

while [ $# -gt 0 ]; do
  case "${1}" in
    --dry-run) DRY_RUN=1; shift ;;
    --stage) STAGE="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Opcion desconocida: ${1}" >&2; exit 1 ;;
  esac
done

if [ ! -d "${BACKUP_REPO}/.git" ]; then
  echo "[${TIMESTAMP}] ERROR: ${BACKUP_REPO} no es un repo git"
  exit 1
fi

# Abortar si la config activa esta vacia o solo tiene $schema.
if [ ! -f "${CONFIG_DIR}/opencode.jsonc" ]; then
  echo "[${TIMESTAMP}] ERROR: falta ${CONFIG_DIR}/opencode.jsonc"
  exit 1
fi
if ! grep -q '"model"' "${CONFIG_DIR}/opencode.jsonc" 2>/dev/null; then
  echo "[${TIMESTAMP}] ERROR: config activa sin modelo valido; aborta para evitar borrado masivo"
  exit 1
fi

if [ "${DRY_RUN}" = 1 ]; then
  echo "[${TIMESTAMP}] DRY-RUN: reportando drift solo"
  cd "${BACKUP_REPO}"
  for cat in ${ALLOWED_TOPLEVEL}; do
    if [ -e "${CONFIG_DIR}/${cat}" ] && [ ! -e "${BACKUP_REPO}/${cat}" ]; then
      echo "  + ${cat} existe en config, falta en repo"
    fi
    if [ ! -e "${CONFIG_DIR}/${cat}" ] && [ -e "${BACKUP_REPO}/${cat}" ]; then
      echo "  - ${cat} existe en repo, falta en config"
    fi
  done
  echo "[${TIMESTAMP}] DRY-RUN completo"
  exit 0
fi

if [ -n "${STAGE}" ]; then
  mkdir -p "${STAGE}"
  for cat in ${ALLOWED_TOPLEVEL}; do
    if [ -e "${CONFIG_DIR}/${cat}" ]; then
      cp -a "${CONFIG_DIR}/${cat}" "${STAGE}/" 2>/dev/null || true
    fi
  done
  # Remover secretos y bases privadas del stage
  rm -f "${STAGE}/.env" "${STAGE}/memory.db" "${STAGE}/kanban.json" 2>/dev/null || true
  rm -rf "${STAGE}/config-backups" 2>/dev/null || true
  echo "[${TIMESTAMP}] Stage exportado a ${STAGE}"
  exit 0
fi

echo "[${TIMESTAMP}] Modo interactivo: no se hace commit/push automatico."
echo "Use --dry-run para deteccion de drift o --stage DIR para exportar."
exit 0
