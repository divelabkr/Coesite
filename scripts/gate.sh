#!/usr/bin/env bash
# Local equivalent of the CI security gate chain.

set -euo pipefail

export TMPDIR="${TMPDIR:-/tmp}"
export DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@localhost:5432/coesite}"

echo "================================================"
echo "  Coesite Full Gate"
echo "================================================"

echo "[1/11] Prisma generate..."
pnpm run prisma:generate:ci

echo "[2/11] TypeScript noEmit..."
pnpm run lint

echo "[3/11] Build..."
pnpm run build

echo "[4/11] Focused security regressions..."
pnpm run test:security

echo "[5/11] Unit/integration tests..."
pnpm test

echo "[6/11] E2E tests..."
pnpm run test:e2e

echo "[7/11] P1~P10 scan..."
bash scripts/scan-principles.sh

echo "[8/11] Security Wall..."
bash scripts/security-wall.sh

echo "[9/11] Secret scan..."
bash scripts/secret-scan.sh

echo "[10/11] Dependency audit..."
pnpm audit --audit-level moderate

echo "[11/11] Prisma schema validation..."
pnpm exec prisma validate --schema=prisma/schema.prisma

echo "================================================"
echo "  Coesite Full Gate PASSED"
echo "================================================"
