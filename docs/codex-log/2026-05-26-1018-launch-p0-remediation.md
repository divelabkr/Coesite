# Launch P0 Remediation

## 무엇을 했나

사업/런칭 전 P0 차단 5개를 local gate 기준으로 닫았다. 현재 판정은 **CONDITIONAL GO for controlled pilot readiness**이며, production launch는 P1 잔여 항목과 Deep RedTeam 결과가 닫히기 전까지 NO-GO다.

## 왜

이전 business preflight에서 P0 차단 항목은 OraclePrevention 회귀, dependency audit 취약점, WORM canonical hash 부재, CI 보안 게이트 공백, 외부 계약 부재였다. 실제 사업 준비로 가려면 이 5개가 먼저 닫혀야 했다.

## 변경 파일

- `packages/api/src/common/oracle-prevention/*`: EML nonce masking, 4096B cap, JSON-safe padding, header clear, exception metadata.
- `packages/api/src/common/request-clock/*`: shared request clock middleware.
- `packages/api/src/meta-layer/token-norm/token-norm.middleware.ts`: shared clock 사용, Express 5 readonly query 회귀 방지.
- `packages/api/src/contracts/*`: fail-closed guard API contract.
- `packages/api/test/e2e/app-module-runtime.e2e.test.ts`: runtime/guard contract regression 추가.
- `packages/types/src/index.ts`: guard request/response shared types.
- `packages/sdk/src/index.ts`, `packages/sdk/test/client.test.ts`: fail-closed SDK client.
- `packages/utils/src/worm-canonical.ts`, `packages/utils/test/worm-canonical.test.ts`: WORM canonical hash helper와 tamper tests.
- `package.json`, `packages/api/package.json`, `pnpm-lock.yaml`: Nest/Vitest/Vite/@types dependency remediation.
- `vitest.config.ts`: `dist` test artifact 제외.
- `.github/workflows/ci.yml`, `.github/branch-protection.md`: launch gate CI 확장.
- `scripts/scan-principles.sh`: direct WORM create P5 차단.
- `scripts/secret-scan.sh`: location-only secret scan 추가.
- `docs/openapi.yaml`: OpenAPI 3.1 skeleton.
- `tasks/phase1/business-preflight-risk-register.md`: P0 closure 상태 갱신.

## 검증 결과

- `pnpm -r build`: PASS
- `pnpm -r exec tsc --noEmit`: PASS
- `TMPDIR=/tmp pnpm test`: PASS, 9 files / 93 tests
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS
- `bash scripts/security-wall.sh`: PASS
- `bash scripts/secret-scan.sh`: PASS
- `pnpm audit --audit-level moderate`: PASS, 0 known vulnerabilities
- `DATABASE_URL=postgresql://localhost:5432/coesite pnpm exec prisma validate --schema=prisma/schema.prisma`: PASS
- `docs/openapi.yaml` YAML parse: PASS

## RedTeam 후속

Deep RedTeam은 60분 예산 내 최종 완료하지 못해 PARTIAL로 처리했다. PARTIAL 결과에서 아래 blocker가 나왔고, 모두 같은 배치에서 수정했다.

- Platform P0: WORM canonical hash가 `__proto__` 같은 특수 JSON key를 누락할 수 있음.
  - 조치: null-prototype object + `Object.defineProperty`로 own enumerable key 보존.
  - 회귀: `__proto__`, `constructor`, `prototype` digest binding test 추가.
- Platform P1: SDK가 성공 HTTP 응답 shape를 runtime-validate하지 않음.
  - 조치: `CoesiteClient`가 valid `BLOCK` shape만 수용하고 `PROCEED`/invalid 200은 fail-closed.
- Platform P1: P5 direct WORM-create scanner가 좁고 suspicious path가 warning-only.
  - 조치: bracket notation 탐지 추가, prevHash 누락 suspicious path fatal화.
- Runtime P1: `headersSent` 후 uniformization이 조용히 return됨.
  - 조치: `destroy(Error)` 가능한 응답은 연결 종료.
- Runtime P1: exception log가 query/message를 남길 수 있음.
  - 조치: message redacted, query string 제거.

## 리스크 / 미해결

- Deep RedTeam은 runtime/platform 두 축 모두 PARTIAL이었다. 발견된 P0/P1은 닫았지만, PARTIAL 자체는 production GO 근거로 쓰지 않는다.
- P1 잔여: runtime DB role 활성 검증, WORM payload redaction/encryption, main bootstrap hardening, Security Wall mismatch 재현 절차.
- Coverage 80% threshold는 아직 package script로 강제하지 않았다.
- `/v1/guard/verify`는 Phase 1에서 fail-closed `BLOCK`만 반환한다. 실제 `PROCEED`는 P10 ConsensusGate 전까지 금지한다.
