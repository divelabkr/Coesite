#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_ENV="$ROOT_DIR/infra/.env"
API_ENV="$ROOT_DIR/packages/api/.env"
NONINTERACTIVE="${COESITE_NONINTERACTIVE:-0}"

for arg in "$@"; do
  if [ "$arg" = "--ci" ]; then
    NONINTERACTIVE=1
  fi
done

fail() {
  echo "[preflight] FAIL: $*" >&2
  exit 1
}

warn() {
  echo "[preflight] WARN: $*" >&2
}

env_value() {
  local file="$1"
  local key="$2"
  local line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "$line"
}

validate_env_file() {
  local file="$1"
  [ -f "$file" ] || fail "missing env file: $file"

  if grep -nF "change-me-locally" "$file" >/dev/null; then
    fail "placeholder credential remains in $file"
  fi

  if grep -nF "0.0.0.0" "$file" >/dev/null; then
    fail "0.0.0.0 bind is forbidden in $file"
  fi
}

validate_password() {
  local file="$1"
  local key="$2"
  local value
  value="$(env_value "$file" "$key")"
  [ -n "$value" ] || fail "$key is empty in $file"
}

validate_jwt_secret() {
  local file="$1"
  local value
  value="$(env_value "$file" "JWT_SECRET")"

  [ -n "$value" ] || fail "JWT_SECRET is empty in $file"

  if [ "$value" = "__REPLACE_WITH_RANDOM_32+_BYTES_FROM_KMS__" ]; then
    fail "JWT_SECRET placeholder remains in $file"
  fi

  case "$value" in
    change-me*)
      fail "JWT_SECRET change-me placeholder remains in $file"
      ;;
  esac

  if [ "${#value}" -lt 32 ]; then
    warn "JWT_SECRET is shorter than 32 characters in $file; 32+ is recommended"
  fi
}

check_existing_volumes() {
  if ! command -v docker >/dev/null 2>&1; then
    warn "docker not found; skipping existing coesite volume check"
    return
  fi

  local volumes
  volumes="$(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -F 'coesite-' || true)"
  [ -n "$volumes" ] || return

  echo "[preflight] existing coesite volumes detected:"
  echo "$volumes"
  echo "[preflight] stale volumes can preserve old secrets or schema state."

  if [ "$NONINTERACTIVE" = "1" ]; then
    echo "[preflight] noninteractive mode: refusing to continue with existing volumes." >&2
    exit 2
  fi

  local answer
  read -r -p "Continue anyway? Type 'yes' to continue: " answer
  if [ "$answer" != "yes" ]; then
    echo "[preflight] cancelled by user." >&2
    exit 2
  fi
}

validate_env_file "$INFRA_ENV"
validate_password "$INFRA_ENV" "POSTGRES_PASSWORD"
validate_password "$INFRA_ENV" "REDIS_PASSWORD"

if [ -f "$API_ENV" ]; then
  validate_env_file "$API_ENV"
  validate_jwt_secret "$API_ENV"
else
  warn "packages/api/.env not found; create it before running the API outside Docker"
fi

check_existing_volumes

echo "[preflight] OK"
