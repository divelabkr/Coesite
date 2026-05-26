# Security Regression Chain Integration

## 무엇을 했나
- 결론: 직전 evidence/WORM/SIREN stale-writer 방어 회귀 테스트를 기존 검사 체인에 연결했다.
- 로컬에서는 `pnpm run test:security`와 `pnpm run gate`로 실행된다.
- CI에는 별도 `security-regressions` job과 Phase 6 요구에 맞춘 `e2e` job을 추가했다.

## 왜
- 직전 수정은 focused 테스트로 검증됐지만, 검사 체인에 명시적으로 연결되지 않으면 후속 작업에서 빠질 수 있다.
- 증거 체인, WORM, honeypot, replay/duplicate 방어는 보안 프로그램의 핵심이므로 CI에서 독립 job으로 계속 감시해야 한다.
- Phase 6 기준에는 E2E 별도 job이 요구되어 CI에 분리했다.

## 변경 파일
- `scripts/security-regression.sh`
  - append-only JSONL, ProofBundle, ProvenanceChain, WormLog, SIREN Honeypot 회귀 묶음을 실행.
- `scripts/gate.sh`
  - 로컬 full gate: lint, build, focused security regression, full test, e2e, P1~P10 scan, Security Wall, secret scan, dependency audit, Prisma validate.
- `package.json`
  - `test:security`, `gate` 스크립트 추가.
- `.github/workflows/ci.yml`
  - `e2e` job 추가.
  - `security-regressions` job 추가.
- `tasks/phase6/security-regression-chain-integration.md`
  - 계획 대비 진행표와 영향 맵 기록.

## 검증 결과
- `pnpm run test:security`: PASS
  - 5 files / 66 tests
- `pnpm run gate`: PASS
  - TypeScript noEmit: PASS
  - build: PASS
  - focused security regression: PASS, 66 tests
  - full test: PASS, 25 files / 343 tests
  - e2e: PASS, 2 files / 21 tests
  - P1~P10 scan: PASS
  - Security Wall: PASS
  - Secret scan: PASS
  - dependency audit: PASS, no known vulnerabilities
  - Prisma validate: PASS
- `bash -n scripts/gate.sh scripts/security-regression.sh scripts/scan-principles.sh scripts/security-wall.sh scripts/secret-scan.sh`: PASS
- `git diff --check`: PASS

## 리스크 / 미해결
- CI workflow는 로컬에서 YAML 파싱 전용 도구로 별도 검증하지 않았다. 구조는 기존 job 패턴을 그대로 복제했고, 로컬 full gate는 통과했다.
- `pnpm run gate`는 intentionally heavy 하다. 빠른 개발 중에는 `pnpm run test:security`를 먼저 돌리고, merge/release 전에는 full gate를 돌리는 운영이 적합하다.
- JSONL lock 기반 durable append는 MVP/local filesystem 기준 방어다. 운영 scale-out은 Postgres transaction + S3 Object Lock COMPLIANCE로 승격해야 한다.
