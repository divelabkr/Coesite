#!/usr/bin/env bash
# Focused security regressions that must stay wired into local and CI gates.

set -euo pipefail

export TMPDIR="${TMPDIR:-/tmp}"

echo "================================================"
echo "  Coesite Focused Security Regression Gate"
echo "================================================"
echo ""
echo "[1/1] Evidence/WORM/SIREN stale-writer and replay regressions..."

pnpm exec vitest run \
  packages/api/src/common/append-only-jsonl.test.ts \
  packages/api/src/proof-gate/proof-bundle.service.test.ts \
  packages/api/src/turing/provenance-chain.service.test.ts \
  packages/api/src/trust-cube/worm-log.service.test.ts \
  packages/api/src/meta-layer/siren/siren.service.test.ts

echo ""
echo "================================================"
echo "  Focused Security Regression Gate PASSED"
echo "================================================"
