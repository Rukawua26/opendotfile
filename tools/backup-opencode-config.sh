#!/usr/bin/env bash
set -euo pipefail

BACKUP_REPO="${HOME}/opencode-config-backup"
CONFIG_DIR="${HOME}/.config/opencode"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ ! -d "${BACKUP_REPO}/.git" ]; then
  echo "[${TIMESTAMP}] ERROR: ${BACKUP_REPO} no es un repo git"
  exit 1
fi

cd "${BACKUP_REPO}"

git pull --rebase --autostash origin main 2>/dev/null || true

# Sync config files using cp + rm (no rsync needed)
for item in "${CONFIG_DIR}"/*; do
  name=$(basename "${item}")
  case "${name}" in
    .env|.env.example|node_modules) continue ;;
  esac
  cp -r "${item}" "${BACKUP_REPO}/" 2>/dev/null || true
done

# Evitar que copias antiguas permanezcan en el directorio auto-cargado despues
# de mover plugins opcionales a plugins-optional/.
for plugin in auto-memory.js hooks.js kanban.js memory-v2.js memory.js personalities.js sandbox.js; do
  rm -f "${BACKUP_REPO}/plugins/${plugin}"
done

# Clean files in backup that no longer exist in source
for item in "${BACKUP_REPO}"/*; do
  name=$(basename "${item}")
  case "${name}" in
    .git|.gitignore|README.md|install.sh|package-lock.json|package.json|memory.db|kanban.json|.env.example|docs|assets) continue ;;
  esac
  if [ ! -e "${CONFIG_DIR}/${name}" ]; then
    rm -rf "${item}"
  fi
done

# Sync skills from opencode-custom
SKILLS_SRC="${HOME}/opencode-custom/skills"
if [ -d "${SKILLS_SRC}" ]; then
  rm -rf "${BACKUP_REPO}/skills" 2>/dev/null || true
  cp -r "${SKILLS_SRC}" "${BACKUP_REPO}/skills"
fi

# Sync the OpenCode-specific AGENTS.md without duplicating the home-level rules.
AGENTS_SRC="${CONFIG_DIR}/AGENTS.md"
if [ -f "${AGENTS_SRC}" ]; then
  cp "${AGENTS_SRC}" "${BACKUP_REPO}/AGENTS.md" 2>/dev/null || true
fi

MEMORY_DB="${HOME}/.local/share/opencode/plugins-data/memory.db"
if [ -f "${MEMORY_DB}" ]; then
  sqlite3 "${MEMORY_DB}" ".backup '${BACKUP_REPO}/memory.db'"
fi
cp "${HOME}/.local/share/opencode/plugins-data/kanban.json" "${BACKUP_REPO}/kanban.json" 2>/dev/null || true

# Sync tools directory
TOOLS_SRC="${HOME}/tools"
if [ -d "${TOOLS_SRC}" ]; then
  rm -rf "${BACKUP_REPO}/tools" 2>/dev/null || true
  cp -r "${TOOLS_SRC}" "${BACKUP_REPO}/tools"
fi

# Sync de la documentación OpenCode mantenida en el vault Obsidian.
OPENCODE_DOCS_SRC="${HOME}/docs/opencode"
OPENCODE_DOCS_DST="${BACKUP_REPO}/docs/opencode"
if [ -d "${OPENCODE_DOCS_SRC}" ]; then
  mkdir -p "${OPENCODE_DOCS_DST}"
  cp -a "${OPENCODE_DOCS_SRC}/." "${OPENCODE_DOCS_DST}/"
fi

# Sync spec/constitution
CONSTITUTION_SRC="${HOME}/opencode-custom/spec"
if [ -d "${CONSTITUTION_SRC}" ]; then
  rm -rf "${BACKUP_REPO}/spec" 2>/dev/null || true
  cp -r "${CONSTITUTION_SRC}" "${BACKUP_REPO}/spec"
fi

# Restaurar portabilidad: __HOME__ en archivos con rutas absolutas
for file in "${BACKUP_REPO}/opencode.jsonc" "${BACKUP_REPO}/profiles/work/opencode.jsonc" "${BACKUP_REPO}/profiles/personal/opencode.jsonc" "${BACKUP_REPO}/profiles/light/opencode.jsonc" "${BACKUP_REPO}/tools/agent-consult.ts" "${BACKUP_REPO}/commands/spec.md"; do
  if [ -f "${file}" ]; then
    sed -i "s|${HOME}|__HOME__|g" "${file}"
  fi
done
for file in "${BACKUP_REPO}/injects/"*.jsonc; do
  if [ -f "${file}" ]; then
    sed -i "s|${HOME}|__HOME__|g" "${file}"
  fi
done

# Preservar solo la seleccion activa y convertir sus symlinks absolutos en relativos.
rm -rf "${BACKUP_REPO}/agents"
mkdir -p "${BACKUP_REPO}/agents"
for agent_file in "${CONFIG_DIR}/agents/"*.md; do
  [ -e "${agent_file}" ] || continue
  name=$(basename "${agent_file}")
  if [ -L "${agent_file}" ]; then
    target=$(readlink -f "${agent_file}")
    case "${target}" in
      "${CONFIG_DIR}/agents-library/"*)
        relative_target=${target#"${CONFIG_DIR}/agents-library/"}
        ln -s "../agents-library/${relative_target}" "${BACKUP_REPO}/agents/${name}"
        ;;
      *) cp -L "${agent_file}" "${BACKUP_REPO}/agents/${name}" ;;
    esac
  else
    cp "${agent_file}" "${BACKUP_REPO}/agents/${name}"
  fi
done

# Excluir skills y AGENTS.md del cleanup (estan fuera de config/)
for skip in "skills" "AGENTS.md"; do
  # Proteger estos archivos del cleanup loop
  :
done

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "Auto-backup ${TIMESTAMP}"
  git push origin main 2>/dev/null || echo "[${TIMESTAMP}] Push falló — backup local intacto"
  echo "[${TIMESTAMP}] Backup realizado y commiteado"
else
  echo "[${TIMESTAMP}] Sin cambios — backup no necesario"
fi
