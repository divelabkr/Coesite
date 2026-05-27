# Security Expert Demo Gate

## 무엇을 했나

보안 전문가에게 Coesite 데모를 제출하기 전 실행할 `demo-readiness` 게이트를 만들고, 로컬 full gate와 GitHub Actions에 연결했다.

## 왜

현재 Coesite는 controlled demo 수준까지 올라왔지만, 외부 보안 전문가에게 보내려면 제품 정의, OpenAPI, SDK fail-closed, RedGate proof redaction, 실데이터 금지, CI required checks가 같은 기준으로 묶여 있어야 한다. 이 누락을 자동 게이트로 막았다.

## 변경 파일

- `scripts/demo-readiness.sh`: 데모 제출 전 문서/API/SDK/E2E/CI/branch protection/secret/security 조건을 검사하는 게이트 추가.
- `package.json`: `gate:demo` script 추가.
- `scripts/gate.sh`: full gate를 12단계로 확장하고 마지막에 `pnpm run gate:demo` 실행.
- `.github/workflows/ci.yml`: `demo-readiness` job 추가.
- `.github/branch-protection.md`: required checks에 `demo-readiness` 추가.
- `docs/SECURITY-EXPERT-DEMO-PACK.md`: 보안 전문가 제출 패킷, 실데이터 금지, 시나리오, NO-GO 조건 추가.
- `README.md`, `docs/MVP-LAUNCH-CHECKLIST.md`, `docs/05-PRODUCT-DEFINITION.md`: demo pack과 gate 링크 추가.
- `tasks/phase1/security-expert-demo-gate.md`: 작업 계획/결과 기록.
- `tasks/phase1/business-preflight-risk-register.md`: demo-readiness 업데이트 기록.

## 검증 결과

- `pnpm run gate:demo`: PASS
- `pnpm run gate`: PASS
  - security regressions: 66 passed
  - unit/integration: 343 passed
  - e2e: 21 passed
  - P1~P10 scan: PASS
  - Security Wall: PASS
  - Secret scan: PASS
  - dependency audit: 0 known vulnerabilities
  - Prisma schema validation: PASS
  - demo-readiness: PASS
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS
- `git diff --check`: PASS

## 리스크 / 미해결

- GitHub Actions의 `demo-readiness`는 push 후 원격에서 한 번 더 확인해야 한다.
- 실제 GitHub branch protection 설정은 repository settings 또는 인증된 GitHub API 권한으로 적용해야 한다.
- 보안 전문가 controlled demo는 가능하지만, 고객 실데이터 production 운영은 P1 운영화와 Deep RedTeam 종료 전까지 NO-GO다.
