#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
BACKUP_DIR="${HOME}/.config/opencode.backup.$(date +%Y%m%d-%H%M%S)"
CUSTOM_DIR="${HOME}/opencode-custom"
SKILLS_DIR="${CUSTOM_DIR}/skills"
SPEC_DIR="${CUSTOM_DIR}/spec"

INSTALL_GIT_GATE=0
for arg in "$@"; do
  case "${arg}" in
    --with-git-gate) INSTALL_GIT_GATE=1 ;;
    -h|--help)
      echo "Uso: ./install.sh [--with-git-gate]"
      echo "  --with-git-gate  Instala el hook pre-commit de Organic RDD en .git/hooks/pre-commit"
      exit 0
      ;;
    *) echo "Opcion desconocida: ${arg}" >&2; exit 1 ;;
  esac
done

if [ ! -d "${SOURCE_DIR}/.git" ]; then
  echo "ERROR: Ejecuta desde la raiz del repositorio clonado."
  exit 1
fi

mkdir -p "${HOME}/.config"

for path in "${TARGET_DIR}" "${CUSTOM_DIR}"; do
  if [ -L "${path}" ]; then
    echo "ERROR: se rechaza directorio symlink durante instalacion: ${path}"
    exit 1
  fi
done
mkdir -p "${CUSTOM_DIR}"
if [ ! -O "${CUSTOM_DIR}" ]; then
  echo "ERROR: el usuario actual no es propietario de ${CUSTOM_DIR}"
  exit 1
fi
for path in "${SKILLS_DIR}" "${SPEC_DIR}"; do
  if [ -L "${path}" ]; then
    echo "ERROR: se rechaza destino symlink durante instalacion: ${path}"
    exit 1
  fi
done

# Backup de config existente
if [ -d "${TARGET_DIR}" ]; then
  cp -a "${TARGET_DIR}" "${BACKUP_DIR}"
  echo "Backup creado en: ${BACKUP_DIR}"
fi

# Copiar configuracion principal sin depender de rsync.
mkdir -p "${TARGET_DIR}"

# Retirar copias antiguas que ya no deben auto-cargarse. El backup de la
# configuracion existente se creo arriba antes de esta limpieza.
for plugin in auto-memory.js hooks.js kanban.js memory-v2.js memory.js personalities.js sandbox.js; do
  rm -f "${TARGET_DIR}/plugins/${plugin}"
done

for item in "${SOURCE_DIR}"/* "${SOURCE_DIR}"/.[!.]* "${SOURCE_DIR}"/..?*; do
  [ -e "${item}" ] || continue
  name=$(basename "${item}")
  case "${name}" in
    .git|node_modules|.env|README.md|install.sh|skills|spec|hooks) continue ;;
  esac
  cp -a "${item}" "${TARGET_DIR}/"
done

# Copiar skills a ~/opencode-custom/skills
rm -rf "${SKILLS_DIR}"
mkdir -p "$(dirname "${SKILLS_DIR}")"
cp -a "${SOURCE_DIR}/skills" "${SKILLS_DIR}"

# Restore specs to the same canonical source consumed by the backup job.
rm -rf "${SPEC_DIR}"
mkdir -p "$(dirname "${SPEC_DIR}")"
cp -a "${SOURCE_DIR}/spec" "${SPEC_DIR}"

# No crear ni sobrescribir reglas globales. El archivo del backup se instala
# dentro de ~/.config/opencode junto con el resto de la configuracion.

# Reemplazar __HOME__ por el home real del usuario
for file in \
  "${TARGET_DIR}/opencode.jsonc" \
  "${TARGET_DIR}/profiles/work/opencode.jsonc" \
  "${TARGET_DIR}/profiles/personal/opencode.jsonc" \
  "${TARGET_DIR}/profiles/light/opencode.jsonc" \
  "${TARGET_DIR}/tools/agent-consult.ts" \
  "${TARGET_DIR}/commands/spec.md"; do
  if [ -f "${file}" ]; then
    sed -i "s|__HOME__|${HOME}|g" "${file}"
  fi
done
for file in "${TARGET_DIR}/injects/"*.jsonc; do
  if [ -f "${file}" ]; then
    sed -i "s|__HOME__|${HOME}|g" "${file}"
  fi
done

# Los symlinks relativos y agentes regulares se preservan con rsync -a.
agent_count=0
for agent_file in "${TARGET_DIR}/agents/"*.md; do
  [ -e "${agent_file}" ] || {
    if [ -L "${agent_file}" ]; then
      echo "ERROR: symlink de agente roto: ${agent_file}"
      exit 1
    fi
    continue
  }
  agent_count=$((agent_count + 1))
done
echo "Agentes activos restaurados: ${agent_count}"

# Crear .env si no existe
if [ ! -f "${TARGET_DIR}/.env" ]; then
  cp "${SOURCE_DIR}/.env.example" "${TARGET_DIR}/.env"
  echo "Se creo ${TARGET_DIR}/.env. Agrega tus API keys antes de usar MCP."
fi

# Instalar dependencias npm, salvo en pruebas de restauracion aisladas.
if [ "${OPENCODE_SKIP_INSTALL:-0}" = "1" ]; then
  echo "Instalacion npm omitida por OPENCODE_SKIP_INSTALL=1"
elif [ -f "${TARGET_DIR}/package-lock.json" ]; then
  npm ci --prefix "${TARGET_DIR}"
else
  npm install --prefix "${TARGET_DIR}"
fi

echo ""
echo "Instalacion completada:"
echo "  Config: ${TARGET_DIR}"
echo "  Skills: ${SKILLS_DIR}"
echo "  Specs: ${SPEC_DIR}"
echo "  Rules: ${HOME}/AGENTS.md"
echo ""

# Copiar hooks de referencia a la config activa.
if [ -d "${SOURCE_DIR}/hooks" ]; then
  mkdir -p "${TARGET_DIR}/hooks"
  cp -a "${SOURCE_DIR}/hooks/." "${TARGET_DIR}/hooks/"
fi

# Instalar el hook pre-commit de Organic RDD en el repo actual (opcional).
if [ "${INSTALL_GIT_GATE}" = "1" ]; then
  GIT_HOOKS_DIR="$(git rev-parse --git-path hooks 2>/dev/null || true)"
  if [ -n "${GIT_HOOKS_DIR}" ] && [ -f "${SOURCE_DIR}/hooks/pre-commit" ]; then
    if [ -e "${GIT_HOOKS_DIR}/pre-commit" ]; then
      echo "Backup del hook pre-commit existente: ${GIT_HOOKS_DIR}/pre-commit.organic-rdd.bak"
      cp -a "${GIT_HOOKS_DIR}/pre-commit" "${GIT_HOOKS_DIR}/pre-commit.organic-rdd.bak"
    fi
    cp -a "${SOURCE_DIR}/hooks/pre-commit" "${GIT_HOOKS_DIR}/pre-commit"
    chmod +x "${GIT_HOOKS_DIR}/pre-commit"
    echo "Git gate hook instalado en: ${GIT_HOOKS_DIR}/pre-commit"
  else
    echo "WARN: no se pudo resolver .git/hooks o falta hooks/pre-commit; no se instalo el gate."
  fi
fi

echo "Reinicia OpenCode para que cargue la nueva configuracion."
