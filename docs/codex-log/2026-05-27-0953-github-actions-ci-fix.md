# GitHub Actions CI fix

## 무엇을 했나
- GitHub 원격 `divelabkr/Coesite`에 Coesite MVP 보안 게이트 체인을 푸시했다.
- GitHub Actions 1차 run 실패를 확인하고 CI fresh runner 기준으로 수정했다.
- `prisma:generate:ci`를 추가해 Prisma Client를 명시 생성하도록 했다.
- GitHub Actions의 격리된 test/e2e/security-regressions job 안에서도 workspace build를 수행하도록 했다.

## 왜
- CI runner에서 pnpm이 dependency build script를 자동 실행하지 않아 `@prisma/client`가 생성되지 않았다.
- `build` job에서 만든 `dist` 산출물은 별도 `test` job으로 전달되지 않아 `@coesite/utils` package entry를 찾지 못했다.
- 로컬은 이전 build 산출물이 남아 있어 같은 문제가 가려져 있었다.

## 변경 파일
- `package.json`
  - `prisma:generate:ci` script 추가.
- `.github/workflows/ci.yml`
  - build/type-check/test/e2e/security-regressions/scan-principles 전에 Prisma Client 생성 추가.
  - test/e2e/security-regressions job 내부에 `pnpm -r build` 추가.
- `scripts/gate.sh`
  - 로컬 full gate 시작 단계에 Prisma Client 생성 추가.

## 검증 결과
- 로컬 `pnpm run gate`: PASS
  - security regressions: 66 passed
  - unit/integration: 343 passed
  - e2e: 21 passed
  - P1~P10 scan: PASS
  - Security Wall: PASS
  - Secret scan: PASS
  - dependency audit: PASS
  - Prisma schema validation: PASS
- 로컬 `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS
- GitHub Actions run #3: PASS
  - URL: https://github.com/divelabkr/Coesite/actions/runs/26483975945
  - commit: `26be166c83c16cf69249ca66f97cd859427a9cf3`
  - jobs: install, build, type-check, test, e2e, security-regressions, dependency-audit, prisma-validate, scan-principles, secret-scan, constitution-drift, security-wall all success.

## 리스크 / 미해결
- GitHub Actions가 Node.js 20 기반 action deprecation warning을 출력했다. 현재 실패 원인은 아니지만 2026-06-02 이후 runner 기본 변화 전에 추적이 필요하다.
- 로컬 git이 unreachable loose object GC 경고를 출력했다. 코드/CI 실패 원인은 아니며 별도 housekeeping 작업으로 분리하는 것이 안전하다.
