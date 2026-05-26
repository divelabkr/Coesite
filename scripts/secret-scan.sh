#!/usr/bin/env bash
# Coesite secret scanner. Prints locations only; never echoes matched values.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCAN_PATHS=(
  ".github"
  "docs"
  "infra"
  "packages"
  "prisma"
  "scripts"
  "tasks"
  "AGENTS.md"
  "CLAUDE.md"
  "README.md"
  ".env"
  ".env.example"
  "package.json"
  "pnpm-lock.yaml"
)

EXCLUDE_GLOBS=(
  "*/node_modules/*"
  "*/dist/*"
  "*/build/*"
  "*/coverage/*"
  "*/.git/*"
  "tasks/security-wall.log"
)

FILE_GLOBS=(
  "*.env"
  "*.example"
  "*.json"
  "*.js"
  "*.md"
  "*.prisma"
  "*.sh"
  "*.sql"
  "*.ts"
  "*.yaml"
  "*.yml"
)

PATTERN_LABELS=(
  "aws_access_key"
  "private_key_block"
  "assigned_secret"
  "credentialed_url"
)

PATTERNS=(
  "AKIA[0-9A-Z]{16}"
  "-----BEGIN (RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----"
  "([A-Za-z0-9_]*(api|access|secret|private|client)[_-]?(key|token|secret|password)[A-Za-z0-9_]*|password)[[:space:]]*[:=][[:space:]]*['\\\"][^'\\\"]{12,}['\\\"]"
  "(postgres|postgresql|mysql|mongodb|redis)://[^[:space:]/:@]+:[^[:space:]@]+@"
)

candidate_files=()

matches_exclude() {
  local file="$1"
  local pattern
  for pattern in "${EXCLUDE_GLOBS[@]}"; do
    case "$file" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

has_allowed_extension() {
  local file="$1"
  local pattern
  for pattern in "${FILE_GLOBS[@]}"; do
    case "$(basename "$file")" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

collect_candidate_files() {
  local path="$1"
  local found_file

  if [ -f "$path" ]; then
    if has_allowed_extension "$path" && ! matches_exclude "$path"; then
      candidate_files+=("$path")
    fi
    return 0
  fi

  if [ ! -e "$path" ]; then
    return 0
  fi

  while IFS= read -r -d '' found_file; do
    found_file="${found_file#./}"
    if has_allowed_extension "$found_file" && ! matches_exclude "$found_file"; then
      candidate_files+=("$found_file")
    fi
  done < <(
    find "$path" \
      \( -path "*/node_modules" -o -path "*/dist" -o -path "*/build" -o -path "*/coverage" -o -path "*/.git" \) -prune \
      -o -type f -print0
  )
}

for path in "${SCAN_PATHS[@]}"; do
  collect_candidate_files "$path"
done

echo "=== Coesite Secret Scan ==="

FAIL=0
for index in "${!PATTERNS[@]}"; do
  pattern="${PATTERNS[$index]}"
  label="${PATTERN_LABELS[$index]}"
  while IFS= read -r hit; do
    [ -z "$hit" ] && continue
    location="$(echo "$hit" | cut -d: -f1,2)"
    line="$(sed -n "${location##*:}p" "${location%%:*}")"
    if [ "$label" = "credentialed_url" ] && echo "$line" | grep -Eq "user:pass|coesite:coesite|change-me|CHANGEME|\\.\\.\\."; then
      continue
    fi
    echo "❌ ${label}: ${location}"
    FAIL=1
  done < <(grep -InE -- "$pattern" "${candidate_files[@]}" 2>/dev/null || true)
done

if [ "$FAIL" -ne 0 ]; then
  echo "Secret Scan FAILED"
  exit 1
fi

echo "Secret Scan PASSED"
