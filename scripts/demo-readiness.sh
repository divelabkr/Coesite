#!/usr/bin/env bash
# Final preflight for a controlled external security-expert demo.

set -euo pipefail

FAILURES=0

pass() {
  printf '[PASS] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1" >&2
  FAILURES=$((FAILURES + 1))
}

require_file() {
  local path="$1"
  local label="$2"
  if [[ -f "$path" ]]; then
    pass "$label"
  else
    fail "$label missing: $path"
  fi
}

require_pattern() {
  local path="$1"
  local pattern="$2"
  local label="$3"
  if grep -Eq "$pattern" "$path"; then
    pass "$label"
  else
    fail "$label missing in $path"
  fi
}

forbid_pattern() {
  local path="$1"
  local pattern="$2"
  local label="$3"
  if grep -Eq "$pattern" "$path"; then
    fail "$label forbidden in $path"
  else
    pass "$label"
  fi
}

run_gate() {
  local label="$1"
  shift
  if "$@"; then
    pass "$label"
  else
    fail "$label failed"
  fi
}

echo "================================================"
echo "  Coesite Demo Readiness Gate"
echo "================================================"

require_file "README.md" "README present"
require_file "docs/05-PRODUCT-DEFINITION.md" "product definition present"
require_file "docs/MVP-LAUNCH-CHECKLIST.md" "launch checklist present"
require_file "docs/SECURITY-EXPERT-DEMO-PACK.md" "security expert demo pack present"
require_file "docs/openapi.yaml" "OpenAPI contract present"
require_file ".github/branch-protection.md" "branch protection guide present"
require_file ".github/CODEOWNERS" "CODEOWNERS present"
require_file "packages/sdk/package.json" "SDK package manifest present"
require_file "packages/sdk/src/index.ts" "SDK source present"
require_file "packages/api/test/e2e/app-module-runtime.e2e.test.ts" "runtime E2E present"

require_pattern "docs/05-PRODUCT-DEFINITION.md" '^## 5W1H$' "5W1H product definition anchored"
require_pattern "docs/05-PRODUCT-DEFINITION.md" '^## 하지 않는 것$' "product non-goals anchored"
require_pattern "docs/05-PRODUCT-DEFINITION.md" 'Controlled paid pilot \| 조건부 가능' "controlled pilot status documented"
require_pattern "docs/05-PRODUCT-DEFINITION.md" 'Production launch \| P1 운영화와 장시간 RedTeam 종료 전까지 보류' "production launch hold documented"

require_pattern "docs/SECURITY-EXPERT-DEMO-PACK.md" '실데이터 금지' "no-real-data rule documented"
require_pattern "docs/SECURITY-EXPERT-DEMO-PACK.md" '데모 전 필수 게이트' "demo gate checklist documented"
require_pattern "docs/SECURITY-EXPERT-DEMO-PACK.md" '보안 전문가에게 보내는 항목' "external submission contents documented"
require_pattern "docs/SECURITY-EXPERT-DEMO-PACK.md" 'NO-GO' "demo NO-GO criteria documented"

require_pattern "README.md" 'docs/SECURITY-EXPERT-DEMO-PACK.md' "README links demo pack"
require_pattern "docs/MVP-LAUNCH-CHECKLIST.md" 'pnpm run gate:demo' "launch checklist includes demo gate"
require_pattern "docs/MVP-LAUNCH-CHECKLIST.md" 'Security Expert Demo Pack' "launch checklist references demo pack"

require_pattern "docs/openapi.yaml" '^  /v1/guard/verify:' "OpenAPI guard verify path present"
require_pattern "docs/openapi.yaml" '^  /v1/redgate/proofs/\{requestId\}:' "OpenAPI RedGate proof path present"
require_pattern "docs/openapi.yaml" 'bearerAuth:' "OpenAPI bearer auth present"
require_pattern "docs/openapi.yaml" 'CoesiteProofBundleView:' "OpenAPI proof bundle view present"
require_pattern "docs/openapi.yaml" 'subjectRefHash:' "proof view exposes subject hash only"
require_pattern "docs/openapi.yaml" 'resourceHash:' "proof view exposes resource hash only"
forbid_pattern "docs/openapi.yaml" 'rawContext|rawSubjectRef|rawResource' "OpenAPI raw proof fields absent"

require_pattern "packages/sdk/src/index.ts" 'failClosed\(' "SDK fail-closed path present"
require_pattern "packages/sdk/src/index.ts" 'verifyCoesiteGuardResponseReceipt' "SDK verifies response receipt"
require_pattern "packages/sdk/src/index.ts" 'getProofBundle' "SDK exposes proof lookup"

require_pattern "packages/api/test/e2e/app-module-runtime.e2e.test.ts" 'supports the customer SDK journey' "E2E covers SDK customer journey"
require_pattern "packages/api/test/e2e/app-module-runtime.e2e.test.ts" 'API key is invalid' "E2E covers invalid API key fail-closed"
require_pattern "packages/api/test/e2e/app-module-runtime.e2e.test.ts" 'response verification key is wrong' "E2E covers invalid receipt fail-closed"
require_pattern "packages/api/test/e2e/app-module-runtime.e2e.test.ts" 'rejects unauthenticated RedGate proof requests uniformly' "E2E covers RedGate auth rejection"
require_pattern "packages/api/test/e2e/app-module-runtime.e2e.test.ts" 'blocks risky guard requests through the runtime gate' "E2E covers risky request BLOCK"
require_pattern "packages/api/test/e2e/app-module-runtime.e2e.test.ts" 'not\.toContain\("sdk-agent-1"\)' "E2E checks proof hides raw subject"
require_pattern "packages/api/test/e2e/app-module-runtime.e2e.test.ts" 'not\.toContain\("sdk-doc-1"\)' "E2E checks proof hides raw resource"

require_pattern ".github/workflows/ci.yml" '^  demo-readiness:' "CI demo-readiness job present"
require_pattern ".github/branch-protection.md" '`demo-readiness`' "branch protection guide includes demo-readiness"

run_gate "Security Wall" bash scripts/security-wall.sh
run_gate "Secret scan" bash scripts/secret-scan.sh
run_gate "SDK pack dry-run" pnpm --filter @coesite/sdk pack --dry-run

if [[ "$FAILURES" -ne 0 ]]; then
  echo "================================================" >&2
  echo "  Coesite Demo Readiness Gate FAILED: $FAILURES" >&2
  echo "================================================" >&2
  exit 1
fi

echo "================================================"
echo "  Coesite Demo Readiness Gate PASSED"
echo "================================================"
