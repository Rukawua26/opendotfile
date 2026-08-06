#!/usr/bin/env bash
# Regression tests for the safe backup script.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${REPO}/tools/backup-opencode-config.sh"
PASS=0
FAIL=0

assert_abort_on_empty_config() {
  local tmp_home
  tmp_home=$(mktemp -d)
  trap "rm -rf ${tmp_home}" RETURN
  mkdir -p "${tmp_home}/.config/opencode" "${tmp_home}/opendotfile"
  git init -q "${tmp_home}/opendotfile"
  printf '{\n  "$schema": "https://opencode.ai/config.json"\n}\n' > "${tmp_home}/.config/opencode/opencode.jsonc"
  if HOME="${tmp_home}" bash "${SCRIPT}" --dry-run >/tmp/backup-test-out 2>&1; then
    echo "FAIL: script should abort on empty config"
    cat /tmp/backup-test-out
    FAIL=$((FAIL + 1))
    return
  fi
  if grep -q "aborta para evitar borrado masivo" /tmp/backup-test-out; then
    PASS=$((PASS + 1))
  else
    echo "FAIL: expected abort message, got:"
    cat /tmp/backup-test-out
    FAIL=$((FAIL + 1))
  fi
}

assert_no_git_add_a() {
  if grep -q "git add -A" "${SCRIPT}"; then
    echo "FAIL: script contains 'git add -A'"
    FAIL=$((FAIL + 1))
  else
    PASS=$((PASS + 1))
  fi
}

assert_no_auto_push() {
  if grep -q "git push" "${SCRIPT}"; then
    echo "FAIL: script contains 'git push'"
    FAIL=$((FAIL + 1))
  else
    PASS=$((PASS + 1))
  fi
}

assert_no_memory_db_versioning() {
  if grep -Eq '(sqlite3|cp .*memory\.db|memory\.db .*BACKUP_REPO)' "${SCRIPT}"; then
    echo "FAIL: script copies or backs up memory.db"
    FAIL=$((FAIL + 1))
  else
    PASS=$((PASS + 1))
  fi
}

assert_no_kanban_versioning() {
  if grep -Eq '(cp .*\$\{HOME\}.*kanban\.json|kanban\.json.*BACKUP_REPO)' "${SCRIPT}"; then
    echo "FAIL: script copies kanban.json into repo"
    FAIL=$((FAIL + 1))
  else
    PASS=$((PASS + 1))
  fi
}

assert_abort_on_missing_config() {
  local tmp_home
  tmp_home=$(mktemp -d)
  trap "rm -rf ${tmp_home}" RETURN
  mkdir -p "${tmp_home}/opendotfile"
  git init -q "${tmp_home}/opendotfile"
  if HOME="${tmp_home}" bash "${SCRIPT}" --dry-run >/tmp/backup-test-out2 2>&1; then
    echo "FAIL: script should abort when config dir does not exist"
    FAIL=$((FAIL + 1))
  else
    PASS=$((PASS + 1))
  fi
}

assert_abort_on_empty_config
assert_no_git_add_a
assert_no_auto_push
assert_no_memory_db_versioning
assert_no_kanban_versioning
assert_abort_on_missing_config

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
if [ "${FAIL}" -gt 0 ]; then
  exit 1
fi
exit 0
