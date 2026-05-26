## Executive Summary

**결론 (한 문장)**: CONDITIONAL GO - Coesite는 이제 `/v1/guard/verify` paid-MVP API가 Runtime Seyer를 실제 호출해 PROCEED/BLOCK을 반환하고, SDK/OpenAPI/README/런칭 체크리스트까지 판매 가능한 최소 표면을 갖췄다.

**합의된 P0** (즉시 차단 필요):
- 없음.

**합의된 P1** (단기 정리):
- 운영 판매 전 `COESITE_POLICY_HMAC_KEY`, `COESITE_ALLOWED_ACTIONS`, 고객 API key 발급/회수, WORM 영속 저장 어댑터를 고객별로 고정해야 한다.

**이견·미해결**:
- 현재는 paid pilot 가능한 MVP runtime surface다. 완전 운영형 SOC/감사 제품은 Redis/Prisma/S3/KMS 어댑터와 장시간 RedTeam 검증이 더 필요하다.

**차단 항목**:
- 대규모 고객/규제 고객에게 판매 전에는 운영 DB/Redis/S3/KMS 연동과 배포 환경 검증 필요.

**근거 파일**:
- `packages/api/src/contracts/guard.controller.ts`
- `packages/api/src/common/mvp-runtime.ts`
- `packages/sdk/src/index.ts`
- `docs/openapi.yaml`
- `README.md`
- `docs/MVP-LAUNCH-CHECKLIST.md`

---

## 무엇을 했나

paid MVP가 되도록 실제 외부 제품 표면을 만들었다.

- `/v1/guard/verify`가 더 이상 항상 BLOCK을 반환하지 않는다.
- Guard API가 `RuntimeSeyerGateService`를 호출한다.
- 안전 요청은 `PROCEED`, 위험 요청은 `BLOCK`으로 반환한다.
- SDK가 검증된 `PROCEED` 응답을 정상 수용한다.
- invalid response, network error는 계속 fail-closed다.
- Nest 런타임용 MVP allowList policy provider와 ComplyGate HMAC 옵션을 추가했다.
- README에 유료 MVP 사용 흐름과 운영 환경 변수를 추가했다.
- OpenAPI를 Runtime Seyer MVP 계약으로 갱신했다.
- paid MVP 런칭 체크리스트를 추가했다.

## 왜

내부 보안 게이트만 있으면 데모다. 돈 받고 팔 MVP가 되려면 고객이 호출할 API와 SDK가 실제 gate를 통과해 control signal을 반환해야 한다. 이번 작업은 제품 표면을 Runtime Seyer와 연결해 구매자가 통합할 수 있는 최소 단위를 만들었다.

## 변경 파일

- `packages/api/src/contracts/guard.controller.ts`
  - Runtime Seyer 연결, 세션 예산 생성, MVP 정책 서명, PROCEED/BLOCK 응답 생성.
- `packages/api/src/contracts/contracts.module.ts`
  - TrustCube/Turing module import.
- `packages/api/src/common/mvp-runtime.ts`
  - MVP allowList/HMAC/runtime policy helper 추가.
- `packages/api/src/meta-layer/allowlist-gted/allowlist-gted.module.ts`
  - Nest 런타임 policy provider 추가.
- `packages/api/src/trust-cube/trust-cube.module.ts`
  - ComplyGate HMAC option provider 추가.
- `packages/api/src/turing/session-budget.service.ts`
  - `ensureSession` 추가.
- `packages/sdk/src/index.ts`
  - 검증된 `PROCEED` 응답 수용, evidence shape 검증 강화.
- `packages/sdk/test/client.test.ts`
  - PROCEED SDK 테스트 추가.
- `packages/api/test/e2e/app-module-runtime.e2e.test.ts`
  - Runtime Guard API PROCEED/BLOCK E2E 테스트 추가.
- `docs/openapi.yaml`
  - paid MVP Runtime Seyer API 설명과 예시 갱신.
- `README.md`
  - MVP 사용 예시, 환경 변수, 게이트 확인 명령 추가.
- `docs/MVP-LAUNCH-CHECKLIST.md`
  - 판매 가능 범위, NO-GO 조건, 운영화 작업 정리.

## 검증 결과

- `pnpm --dir packages/api exec tsc --noEmit -p tsconfig.json`: PASS.
- `pnpm --dir packages/sdk exec tsc --noEmit -p tsconfig.json`: PASS.
- `TMPDIR=/tmp pnpm exec vitest run packages/sdk/test/client.test.ts packages/api/src/trust-cube/runtime-seyer-gate.service.test.ts`: PASS, 14 tests.
- AppModule Nest DI smoke: PASS.
- `TMPDIR=/tmp pnpm exec vitest run packages/api/test/e2e/app-module-runtime.e2e.test.ts`: PASS, 12 tests.
- `python3` OpenAPI YAML parse: PASS.
- `pnpm -r exec tsc --noEmit`: PASS.
- `pnpm -r build`: PASS.
- `TMPDIR=/tmp pnpm test`: PASS, 16 files / 276 tests.
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS.
- `bash scripts/security-wall.sh`: PASS.
- `bash scripts/secret-scan.sh`: PASS.
- `pnpm audit --audit-level moderate`: PASS, known vulnerabilities 0.

## 리스크 / 미해결

- 로컬 MVP 기본 HMAC key는 개발용 fallback이다. 프로덕션은 `COESITE_POLICY_HMAC_KEY`를 secret manager/KMS로 주입해야 한다.
- `COESITE_ALLOWED_ACTIONS`는 고객 계약 범위에 맞게 최소 권한으로 설정해야 한다.
- WORM/provenance/session/rate-limit은 아직 완전한 운영 영속 저장 어댑터가 아니다.
- 고객 API key registry와 billing enforcement는 별도 구현이 필요하다.
- 유료 파일럿 판매 전 장시간 RedTeam/Mythos 검증이 필요하다.
