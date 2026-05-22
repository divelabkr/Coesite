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

fail_url_consistency() {
  echo "[preflight] FAIL: URL consistency violation: $*" >&2
  exit 3
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

database_url_parts() {
  local url="$1"
  local label="$2"
  local rest authority path_query db hostport userinfo user host port

  case "$url" in
    postgresql://*|postgres://*) ;;
    *) fail_url_consistency "$label must start with postgresql:// or postgres://" ;;
  esac

  rest="${url#*://}"
  authority="${rest%%/*}"
  if [ "$authority" = "$rest" ]; then
    fail_url_consistency "$label is missing database path"
  fi

  path_query="${rest#*/}"
  db="${path_query%%\?*}"
  db="${db%%#*}"
  [ -n "$db" ] || fail_url_consistency "$label is missing database name"

  userinfo=""
  user=""
  hostport="$authority"
  if [ "$authority" != "${authority#*@}" ]; then
    userinfo="${authority%@*}"
    user="${userinfo%%:*}"
    hostport="${authority##*@}"
  fi

  if [ "$hostport" != "${hostport%:*}" ]; then
    host="${hostport%:*}"
    port="${hostport##*:}"
  else
    host="$hostport"
    port=""
  fi

  [ -n "$host" ] || fail_url_consistency "$label is missing host"
  printf '%s\t%s\t%s\t%s\n' "$user" "$host" "$port" "$db"
}

validate_database_url_consistency() {
  local file="$1"
  local owner_url runtime_url owner_parts runtime_parts
  local owner_user owner_host owner_port owner_db
  local runtime_user runtime_host runtime_port runtime_db

  owner_url="$(env_value "$file" "OWNER_DATABASE_URL")"
  runtime_url="$(env_value "$file" "RUNTIME_DATABASE_URL")"
  [ -n "$owner_url" ] || fail_url_consistency "OWNER_DATABASE_URL is empty in $file"
  [ -n "$runtime_url" ] || fail_url_consistency "RUNTIME_DATABASE_URL is empty in $file"

  owner_parts="$(database_url_parts "$owner_url" "OWNER_DATABASE_URL in $file")"
  runtime_parts="$(database_url_parts "$runtime_url" "RUNTIME_DATABASE_URL in $file")"

  IFS=$'\t' read -r owner_user owner_host owner_port owner_db <<< "$owner_parts"
  IFS=$'\t' read -r runtime_user runtime_host runtime_port runtime_db <<< "$runtime_parts"

  if [ "$owner_host" != "$runtime_host" ] || [ "$owner_port" != "$runtime_port" ] || [ "$owner_db" != "$runtime_db" ]; then
    fail_url_consistency "OWNER_DATABASE_URL and RUNTIME_DATABASE_URL must share host, port, and database name in $file"
  fi

  if [ -n "$owner_user" ] && [ "$owner_user" = "$runtime_user" ]; then
    warn "OWNER_DATABASE_URL and RUNTIME_DATABASE_URL use the same user in $file; owner=runtime is a misuse risk"
  fi
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
validate_database_url_consistency "$INFRA_ENV"

if [ -f "$API_ENV" ]; then
  validate_env_file "$API_ENV"
  validate_jwt_secret "$API_ENV"
  validate_database_url_consistency "$API_ENV"
else
  warn "packages/api/.env not found; create it before running the API outside Docker"
fi

check_existing_volumes

echo "[preflight] OK"
