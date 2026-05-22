#!/usr/bin/env bash
# Coesite MVP P0 — P1~P10 Principles Automated Scan
# Run in CI: detects violations before merge.
# Also run pre-commit and during Claude Code sessions.

set -e

SCAN_DIR="${SCAN_DIR:-src}"
EXCLUDE_DIRS="--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.git --exclude-dir=coverage"

echo "================================================"
echo "  Coesite P1~P10 Principles Scan"
echo "================================================"
echo "Scan dir: $SCAN_DIR"
echo ""

FAIL=0

# ─── P1: 비판단 원칙 — No ML/AI judgment ──────────────────────
echo "[P1] Non-judgment check (No ML/AI in judgment paths)..."
# Exclude comment lines (// and *) — only flag actual code usage
P1_HITS=$(grep -rn $EXCLUDE_DIRS \
  -E "from .tensorflow|from .pytorch|from .onnx|require\(.tensorflow|require\(.pytorch|\.predict\(|new NeuralNet|import .* tensorflow|import .* pytorch" \
  "$SCAN_DIR" --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v "^\s*//\|^\s*\*" || true)

if [ -n "$P1_HITS" ]; then
  echo "❌ P1 VIOLATION: ML judgment detected"
  echo "$P1_HITS"
  FAIL=1
else
  echo "✅ P1 OK"
fi
echo ""

# ─── P2: Fail-Closed — No silent catch ────────────────────────
echo "[P2] Fail-Closed check (No silent catch blocks)..."
P2_HITS=$(grep -rn $EXCLUDE_DIRS \
  -E "catch[[:space:]]*\([^)]*\)[[:space:]]*\{[[:space:]]*\}|catch[[:space:]]*\([^)]*\)[[:space:]]*\{[[:space:]]*//[[:space:]]*(pass|allow|continue|skip|ignore)" \
  "$SCAN_DIR" --include="*.ts" --include="*.js" 2>/dev/null || true)

if [ -n "$P2_HITS" ]; then
  echo "❌ P2 VIOLATION: Silent catch detected"
  echo "$P2_HITS"
  FAIL=1
else
  echo "✅ P2 OK"
fi
echo ""

# ─── P3: WORM 불변 — No UPDATE/DELETE on WORM tables ─────────
echo "[P3] WORM immutability check..."
WORM_TABLES="AuditLog|WormLog|AdminActionLog|DmsTriggerLog|ProofBundle|auditLog|wormLog|adminActionLog|dmsTriggerLog|proofBundle"

P3_HITS=$(grep -rn $EXCLUDE_DIRS \
  -E "($WORM_TABLES)\.(update|delete|deleteMany|updateMany|upsert)" \
  "$SCAN_DIR" --include="*.ts" --include="*.js" 2>/dev/null || true)

# Also check raw SQL
P3_SQL=$(grep -rn $EXCLUDE_DIRS \
  -iE "(UPDATE|DELETE|TRUNCATE).*(audit_log|worm_log|admin_action_log|dms_trigger_log|proof_bundle)" \
  "$SCAN_DIR" --include="*.ts" --include="*.js" --include="*.sql" 2>/dev/null | \
  grep -v "prevent_\|trigger" || true)

if [ -n "$P3_HITS" ] || [ -n "$P3_SQL" ]; then
  echo "❌ P3 VIOLATION: WORM table mutation detected"
  [ -n "$P3_HITS" ] && echo "$P3_HITS"
  [ -n "$P3_SQL" ] && echo "$P3_SQL"
  FAIL=1
else
  echo "✅ P3 OK"
fi
echo ""

# ─── P4: HumanGate 채널 분리 ────────────────────────────────
echo "[P4] HumanGate channel separation check..."
# HumanGate가 toolCall에 등록되면 안 됨
P4_HITS=$(grep -rn $EXCLUDE_DIRS \
  -E "tools.*HumanGate|toolCall.*HumanGate|humanGate.*tool|registerTool.*HumanGate" \
  "$SCAN_DIR" --include="*.ts" --include="*.js" 2>/dev/null || true)

if [ -n "$P4_HITS" ]; then
  echo "❌ P4 VIOLATION: HumanGate registered as agent toolCall"
  echo "$P4_HITS"
  FAIL=1
else
  echo "✅ P4 OK"
fi
echo ""

# ─── P5: AttestationChain prevHash 누락 ────────────────────────
echo "[P5] AttestationChain continuity check..."
# AuditLog 생성 시 prevHash 필드 누락 패턴
P5_HITS=$(grep -rn $EXCLUDE_DIRS -A 10 \
  -E "auditLog\.create|wormLog\.create|adminActionLog\.create|dmsTriggerLog\.create|proofBundle\.create" \
  "$SCAN_DIR" --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -B 1 "data:" | grep -v "prevHash" | grep "data:" || true)

if [ -n "$P5_HITS" ]; then
  echo "⚠️  P5 SUSPICIOUS: WORM record creation without prevHash (manual review)"
  echo "$P5_HITS"
  # Don't fail - just warn (false positives possible)
else
  echo "✅ P5 OK"
fi
echo ""

# ─── P6: 결합의존 (FR 연동) ────────────────────────────────
echo "[P6] Combined dependency check (CG+SY+PG must coexist)..."
# Check that ComplyGate / Seyer / ProofGate are not used alone in production code
# Heuristic: if a service file uses only one of them, flag for review
# (skipping deep check — manual review for now)
echo "✅ P6 SKIPPED (manual architecture review required)"
echo ""

# ─── P7: 환각 금지 — tsc check ──────────────────────────────
echo "[P7] Hallucination check (tsc --noEmit)..."
if command -v npx >/dev/null 2>&1; then
  if [ -f tsconfig.json ] || [ -f packages/api/tsconfig.json ]; then
    TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
    TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
    if [ "$TSC_ERRORS" -gt 0 ]; then
      echo "❌ P7 VIOLATION: $TSC_ERRORS TypeScript errors"
      echo "$TSC_OUTPUT" | head -20
      FAIL=1
    else
      echo "✅ P7 OK (tsc 0 errors)"
    fi
  else
    echo "⚠️  P7 SKIPPED (tsconfig.json not found)"
  fi
else
  echo "⚠️  P7 SKIPPED (npx not available)"
fi
echo ""

# ─── P8: OraclePrevention ──────────────────────────────────
echo "[P8] OraclePrevention check..."
# Check that OraclePreventionInterceptor is referenced
P8_INTERCEPTOR=$(grep -rn $EXCLUDE_DIRS \
  "OraclePreventionInterceptor\|oracle-prevention" \
  "$SCAN_DIR" --include="*.ts" 2>/dev/null || true)

if [ -z "$P8_INTERCEPTOR" ]; then
  echo "⚠️  P8 WARNING: OraclePreventionInterceptor not found"
  echo "    (Phase 1 이후 필수)"
else
  echo "✅ P8 OK (interceptor present)"
fi

# Check for random response times (anti-pattern)
P8_RANDOM=$(grep -rn $EXCLUDE_DIRS \
  -E "Math\.random.*sleep|setTimeout.*Math\.random|delay.*Math\.random" \
  "$SCAN_DIR" --include="*.ts" --include="*.js" 2>/dev/null || true)

if [ -n "$P8_RANDOM" ]; then
  echo "❌ P8 VIOLATION: Random response time detected (use uniform padding instead)"
  echo "$P8_RANDOM"
  FAIL=1
fi
echo ""

# ─── P9: TrustMetabolism ────────────────────────────────────
echo "[P9] TrustMetabolism cron check..."
P9_CRON=$(grep -rn $EXCLUDE_DIRS \
  -E "TrustMetabolism|trustMetabolism|@Cron.*trust|trust-metabolism" \
  "$SCAN_DIR" --include="*.ts" 2>/dev/null || true)

if [ -z "$P9_CRON" ]; then
  echo "⚠️  P9 WARNING: TrustMetabolism cron not found"
  echo "    (Phase 3 L2 Seyer 이후 필수)"
else
  echo "✅ P9 OK (TrustMetabolism present)"
fi
echo ""

# ─── P10: Consensus Required ───────────────────────────────
echo "[P10] Consensus Gate check..."
P10_CONSENSUS=$(grep -rn $EXCLUDE_DIRS \
  -E "ConsensusGate|consensusGate|consensus.*evaluate|2-of-3|twoOfThree" \
  "$SCAN_DIR" --include="*.ts" 2>/dev/null || true)

if [ -z "$P10_CONSENSUS" ]; then
  echo "⚠️  P10 WARNING: ConsensusGate not found"
  echo "    (Phase 3 L2 Seyer 이후 필수)"
else
  echo "✅ P10 OK (ConsensusGate present)"
fi
echo ""

# ─── Summary ────────────────────────────────────────────────
echo "================================================"
if [ $FAIL -eq 0 ]; then
  echo "  ✅ ALL PRINCIPLES CHECKS PASSED"
  echo "================================================"
  exit 0
else
  echo "  ❌ PRINCIPLES CHECK FAILED"
  echo "================================================"
  echo ""
  echo "ACTION:"
  echo "1. Review violations above"
  echo "2. Fix violations (do NOT bypass)"
  echo "3. Re-run: bash scripts/scan-principles.sh"
  echo "4. If 3 consecutive failures → AUTO-DEBUG 7-step"
  exit 1
fi
