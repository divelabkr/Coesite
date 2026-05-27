# Product Definition Gate

## 무엇을 했나

Coesite의 프로그램 정의를 5W1H 기준으로 별도 canonical 문서에 고정했고, README, paid MVP 런칭 체크리스트, branch protection guide, business preflight risk register를 같은 기준으로 동기화했다.

## 왜

제품 정체성은 `docs/00-MASTER-PLAN.md`와 `README.md`에 흩어져 있었지만, 고객·운영·계약·런칭 게이트에서 바로 참조할 수 있는 5W1H 문서가 부족했다. paid MVP로 팔려면 "무엇을 보장하고, 무엇을 하지 않는지"가 코드 동작과 같은 언어로 고정돼야 한다.

## 변경 파일

- `docs/05-PRODUCT-DEFINITION.md`: Why/Who/What/When/Where/How, 고객 약속, 제외 범위, 사용자 흐름, 현재 판매 가능 상태, 런칭 전 고정 항목을 추가.
- `README.md`: 제품 정의와 MVP 런칭 체크리스트 링크 추가.
- `docs/MVP-LAUNCH-CHECKLIST.md`: 5W1H 제품 정의를 canonical source로 지정하고 런칭 전 게이트/NO-GO 조건에 정합성 검사를 추가.
- `.github/branch-protection.md`: required status checks를 실제 `ci.yml` job 이름과 동기화하고 원격 설정 필요성을 명시.
- `tasks/phase1/business-preflight-risk-register.md`: 2026-05-27 제품 정의/게이트 업데이트 기록 추가.

## 검증 결과

- `git diff --check`: PASS
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS
- `bash scripts/security-wall.sh`: PASS
- `bash scripts/secret-scan.sh`: PASS
- `pnpm run gate`: PASS
  - security regressions: 66 passed
  - unit/integration: 343 passed
  - e2e: 21 passed
  - P1~P10 scan: PASS
  - Security Wall: PASS
  - Secret scan: PASS
  - dependency audit: 0 known vulnerabilities
  - Prisma schema validation: PASS

## 리스크 / 미해결

- 실제 GitHub branch protection 적용은 repository settings 또는 인증된 GitHub API 권한이 필요하다. 현재 파일은 repo-local policy record다.
- controlled paid pilot은 조건부 가능 상태로 정리됐지만, production launch는 P1 운영화와 장시간 RedTeam 종료 전까지 보류다.
- 고객 계약 전에는 allowed actions, tenant/action binding, WORM/append-only writer, key issue/revoke, retention policy를 고객별로 고정해야 한다.
