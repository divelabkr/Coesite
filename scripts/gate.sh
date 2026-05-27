#!/usr/bin/env bash
# Local equivalent of the CI security gate chain.

set -euo pipefail

export TMPDIR="${TMPDIR:-/tmp}"
export DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@localhost:5432/coesite}"

echo "================================================"
echo "  Coesite Full Gate"
echo "================================================"

echo "[1/12] Prisma generate..."
pnpm run prisma:generate:ci

echo "[2/12] TypeScript noEmit..."
pnpm run lint

echo "[3/12] Build..."
pnpm run build

echo "[4/12] Focused security regressions..."
pnpm run test:security

echo "[5/12] Unit/integration tests..."
pnpm test

echo "[6/12] E2E tests..."
pnpm run test:e2e

echo "[7/12] P1~P10 scan..."
bash scripts/scan-principles.sh

echo "[8/12] Security Wall..."
bash scripts/security-wall.sh

echo "[9/12] Secret scan..."
bash scripts/secret-scan.sh

echo "[10/12] Dependency audit..."
pnpm audit --audit-level moderate

echo "[11/12] Prisma schema validation..."
pnpm exec prisma validate --schema=prisma/schema.prisma

echo "[12/12] Security expert demo readiness..."
pnpm run gate:demo

echo "================================================"
echo "  Coesite Full Gate PASSED"
echo "================================================"
