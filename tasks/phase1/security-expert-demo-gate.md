# Security Expert Demo Gate Work Order

## 목적

보안 전문가에게 Coesite 데모를 제출하기 전, 제품 정의·OpenAPI·SDK·증거 흐름·보안 스캔·CI 보호 기준이 모두 같은 상태인지 확인하는 `demo-readiness` 게이트를 추가한다.

## 범위

- `pnpm run gate:demo` 스크립트 추가
- 전체 로컬 게이트 `pnpm run gate`에 demo-readiness 단계 연결
- GitHub Actions에 `demo-readiness` job 추가
- branch protection guide required checks에 `demo-readiness` 추가
- 보안 전문가 제출용 데모 패킷 문서 추가
- README / MVP launch checklist / product definition과 연결
- codex-log 작성

## 금지

- 실제 secret, production endpoint, 고객 실데이터 추가 금지
- 인증 로직, Guard runtime, ProofBundle hash chain의 동작 변경 금지
- 기존 테스트 약화 금지

## 영향 맵

- git:
  - branch: main
  - worktree: /mnt/c/My_Project/Coesite
  - expected: clean before work
- 호출부:
  - `package.json` scripts
  - `scripts/gate.sh`
  - `.github/workflows/ci.yml`
- rules / 권한:
  - branch protection required checks 문서
  - secret/security scan 유지
- 문서:
  - README
  - docs/05-PRODUCT-DEFINITION.md
  - docs/MVP-LAUNCH-CHECKLIST.md
  - docs/SECURITY-EXPERT-DEMO-PACK.md
  - tasks/phase1/business-preflight-risk-register.md
- 테스트:
  - `pnpm run gate:demo`
  - `pnpm run gate`
  - `SCAN_DIR=. bash scripts/scan-principles.sh`
  - `bash scripts/security-wall.sh`
  - `bash scripts/secret-scan.sh`
  - GitHub Actions CI

## 완료 기준

- `pnpm run gate:demo` PASS
- `pnpm run gate` PASS
- GitHub Actions latest run PASS
- 보안 전문가에게 보낼 수 있는 문서가 실데이터 금지와 조건부 데모 범위를 명시


## 결과

- `scripts/demo-readiness.sh` 추가: PASS 조건/NO-GO 조건을 자동 검사.
- `package.json`: `pnpm run gate:demo` 추가.
- `scripts/gate.sh`: 전체 게이트 12단계로 확장.
- `.github/workflows/ci.yml`: `demo-readiness` job 추가.
- `.github/branch-protection.md`: required checks에 `demo-readiness` 추가.
- `docs/SECURITY-EXPERT-DEMO-PACK.md`: 외부 보안 전문가 제출 패킷 추가.

## 검증

- `pnpm run gate:demo`: PASS
- `pnpm run gate`: PASS
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS
- `git diff --check`: PASS

## 판정

보안 전문가 controlled demo 제출은 가능하다. 단, 고객 실데이터 production 운영은 아직 NO-GO다.
