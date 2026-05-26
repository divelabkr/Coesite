#!/usr/bin/env bash
# Local equivalent of the CI security gate chain.

set -euo pipefail

export TMPDIR="${TMPDIR:-/tmp}"
export DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@localhost:5432/coesite}"

echo "================================================"
echo "  Coesite Full Gate"
echo "================================================"

echo "[1/10] TypeScript noEmit..."
pnpm run lint

echo "[2/10] Build..."
pnpm run build

echo "[3/10] Focused security regressions..."
pnpm run test:security

echo "[4/10] Unit/integration tests..."
pnpm test

echo "[5/10] E2E tests..."
pnpm run test:e2e

echo "[6/10] P1~P10 scan..."
bash scripts/scan-principles.sh

echo "[7/10] Security Wall..."
bash scripts/security-wall.sh

echo "[8/10] Secret scan..."
bash scripts/secret-scan.sh

echo "[9/10] Dependency audit..."
pnpm audit --audit-level moderate

echo "[10/10] Prisma schema validation..."
pnpm exec prisma validate --schema=prisma/schema.prisma

echo "================================================"
echo "  Coesite Full Gate PASSED"
echo "================================================"
