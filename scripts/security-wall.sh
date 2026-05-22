#!/usr/bin/env bash
# Coesite Security Wall - sealed keyword scanner.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCAN_PATHS=(
  "packages"
  "docs"
  "scripts"
  "infra"
  "prisma"
  "tasks"
  "README.md"
  "CLAUDE.md"
  ".claude"
  ".github"
)

EXCLUDE_GLOBS=(
  "node_modules/*"
  "*/node_modules/*"
  "dist/*"
  "*/dist/*"
  "build/*"
  "*/build/*"
  ".git/*"
  "*/.git/*"
  ".next/*"
  "*/.next/*"
  "coverage/*"
  "*/coverage/*"
  "docs/04-SECURITY-WALL.md"
  "scripts/security-wall.sh"
)

ALLOWLIST_FILE=".security-wall-allowlist"
ALLOWLIST_GLOBS=()
if [ -f "$ALLOWLIST_FILE" ]; then
  while IFS= read -r allow_pattern || [ -n "$allow_pattern" ]; do
    allow_pattern="${allow_pattern%%#*}"
    allow_pattern="${allow_pattern#"${allow_pattern%%[![:space:]]*}"}"
    allow_pattern="${allow_pattern%"${allow_pattern##*[![:space:]]}"}"
    if [ -n "$allow_pattern" ]; then
      ALLOWLIST_GLOBS+=("$allow_pattern")
    fi
  done < "$ALLOWLIST_FILE"
fi

FILE_GLOBS=(
  "*.md"
  "*.ts"
  "*.js"
  "*.json"
  "*.yaml"
  "*.yml"
  "*.sh"
  "*.prisma"
  "*.sql"
)

MOUNTAIN_KEYWORDS=(
  "R-12"
  "Sapphire"
  "Dormant Genome"
  "Genotype-Phenotype"
  "Genotype Sealing"
  "Genesis Pool"
  "5-layer seal"
  "5층 봉인"
  "ZKBP verification"
  "Lapis Lazuli"
  "Constitutive Binding"
  "AI 설명 강제"
  "4-layer architecture"
  "Shamir 5-of-7"
  "CEO-irreplaceable"
  "Mountain tier"
  "Stone Collector"
  "IP Holdco"
  "3-factor auth + 3-signature"
)

MINE_KEYWORDS=(
  "Coagulation Module"
  "TIAL TombSeal"
  "FR-1"
  "FR-2"
)

VEIN_KEYWORDS=(
  "Autophagy Sublayer"
)

REGEX_PATTERNS=(
  "[RＲ][[:space:]_​‌‍-]*[1１][[:space:]_​‌‍-]*[2２]"
  "[RＲ][[:space:]_​‌‍-]*Twelve"
  "S[[:space:]_​‌‍-]*apph?[[:space:]_​‌‍-]*ire"
  "Lapis[[:space:]_​‌‍-]*Lazuli"
  "사파이어"
  "라피스[[:space:]_​‌‍-]*라줄리"
  "라피스"
)

CRITICAL_HITS=0
HIGH_HITS=0
MED_HITS=0

existing_scan_paths=()
for path in "${SCAN_PATHS[@]}"; do
  if [ -e "$path" ]; then
    existing_scan_paths+=("$path")
  fi
done

candidate_files=()

matches_glob() {
  local file="$1"
  local pattern

  for pattern in "${EXCLUDE_GLOBS[@]}"; do
    case "$file" in
      $pattern) return 0 ;;
    esac
  done

  for pattern in "${ALLOWLIST_GLOBS[@]}"; do
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
    if has_allowed_extension "$path" && ! matches_glob "$path"; then
      candidate_files+=("$path")
    fi
    return 0
  fi

  while IFS= read -r -d '' found_file; do
    found_file="${found_file#./}"
    if has_allowed_extension "$found_file" && ! matches_glob "$found_file"; then
      candidate_files+=("$found_file")
    fi
  done < <(
    find "$path" \
      \( -path "*/node_modules" -o -path "*/dist" -o -path "*/build" -o -path "*/.git" -o -path "*/.next" -o -path "*/coverage" \) -prune \
      -o -type f -print0
  )
}

for path in "${existing_scan_paths[@]}"; do
  collect_candidate_files "$path"
done

echo "=== Coesite Security Wall Scan ==="

scan_fixed_keyword() {
  local keyword="$1"
  local tier="$2"
  local hits

  if [ "${#candidate_files[@]}" -eq 0 ]; then
    hits=""
  else
    hits=$(grep -InF -- "$keyword" "${candidate_files[@]}" 2>/dev/null || true)
  fi
  record_hits "$keyword" "$tier" "$hits"
}

scan_regex_keyword() {
  local pattern="$1"
  local hits

  if [ "${#candidate_files[@]}" -eq 0 ]; then
    hits=""
  else
    hits=$(grep -InE -- "$pattern" "${candidate_files[@]}" 2>/dev/null || true)
  fi
  record_hits "regex:$pattern" "MOUNTAIN" "$hits"
}

record_hits() {
  local label="$1"
  local tier="$2"
  local hits="$3"

  if [ -z "$hits" ]; then
    return 0
  fi

  case "$tier" in
    MOUNTAIN)
      echo "[CRITICAL] sealed keyword detected: $label"
      echo "$hits"
      echo ""
      CRITICAL_HITS=$((CRITICAL_HITS + 1))
      ;;
    MINE)
      echo "[HIGH] restricted keyword detected: $label"
      echo "$hits"
      echo ""
      HIGH_HITS=$((HIGH_HITS + 1))
      ;;
    VEIN)
      mkdir -p tasks
      {
        echo "[MED] restricted keyword detected: $label"
        echo "$hits"
        echo ""
      } >> tasks/security-wall.log
      MED_HITS=$((MED_HITS + 1))
      ;;
  esac
}

for kw in "${MOUNTAIN_KEYWORDS[@]}"; do
  scan_fixed_keyword "$kw" MOUNTAIN
done

for pattern in "${REGEX_PATTERNS[@]}"; do
  scan_regex_keyword "$pattern"
done

for kw in "${MINE_KEYWORDS[@]}"; do
  scan_fixed_keyword "$kw" MINE
done

for kw in "${VEIN_KEYWORDS[@]}"; do
  scan_fixed_keyword "$kw" VEIN
done

echo "=== Summary ==="
echo "Mountain (CRITICAL): $CRITICAL_HITS"
echo "Mine     (HIGH)    : $HIGH_HITS"
echo "Vein     (MED)     : $MED_HITS"

if [ "$CRITICAL_HITS" -gt 0 ]; then
  echo "SECURITY WALL FAILED - critical sealed keywords detected."
  exit 2
fi

if [ "$HIGH_HITS" -gt 0 ]; then
  echo "SECURITY WALL WARNING - high restricted keywords detected."
  exit 1
fi

echo "Security Wall PASSED"
exit 0
