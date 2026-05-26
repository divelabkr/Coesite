# Phase 4~6 ProofGate / RedGate / SDK 통합 로그

## Executive Summary

**결론**: GO. Phase 4~6 MVP 보안 게이트의 핵심 연결인 Guard → ReleaseContract → ProofBundle → RedGate → SDK/E2E 계약이 실제 코드와 테스트로 연결됐다.

**P0/P1 차단 항목**: 없음.

**남은 리스크**: 운영용 DB/S3 Object Lock writer, RedGate key rotation runbook, 장시간 외부 RedTeam/Mythos는 별도 운영화 트랙으로 남는다.

## 무엇을 했나

- Phase 4 ProofGate L3 핵심을 추가했다.
  - PreviewBudget counter
  - ReleaseContract receipt/evidence/signal 검증
  - ProofBundle append-only hash chain
- Phase 5 RedGate 감사 API를 추가했다.
  - `/v1/redgate/proofs/:requestId`
  - 감사자 전용 bearer key
  - raw context/raw subjectRef/raw resource 미노출 proof view
- Phase 6 SDK/E2E/OpenAPI를 갱신했다.
  - `CoesiteClient.getProofBundle()`
  - Guard 호출 후 RedGate proof 조회 E2E
  - OpenAPI 3.1 RedGate path/schema
  - README 및 MVP launch checklist 갱신

## 왜

기존 MVP는 Guard response receipt까지는 강해졌지만, 외부 감사자가 사후에 검증할 수 있는 ProofBundle/RedGate 연결이 비어 있었다. 유료 파일럿/사업 전에는 response가 서명됐다는 사실만으로 부족하고, 요청 단위 증거가 append-only chain으로 남고, 외부 감사 인터페이스에서 raw 민감 정보 없이 확인 가능해야 한다.

## 변경 파일

- `packages/api/src/proof-gate/release-contract.service.ts`: receipt/evidence/signal consistency 검증 import 수정.
- `packages/api/src/proof-gate/preview-budget.service.ts`: preview budget counter 추가.
- `packages/api/src/proof-gate/proof-bundle.service.ts`: ReleaseContract 통과 response를 ProofBundle WORM canonical hash chain으로 기록.
- `packages/api/src/proof-gate/proof-gate.module.ts`, `index.ts`: ProofGate module/export 추가.
- `packages/api/src/red-gate/*`: RedGate read-only auditor API/service/module 추가.
- `packages/api/src/contracts/guard.controller.ts`: Guard response를 반환 전 ProofBundle에 기록하고 preview budget exhaustion은 signed BLOCK으로 처리.
- `packages/api/src/contracts/contracts.module.ts`, `packages/api/src/app.module.ts`: ProofGate/RedGate module 연결.
- `packages/api/src/common/mvp-runtime.ts`: `COESITE_REDGATE_AUDIT_KEYS` production/staging fail-fast helper 추가.
- `packages/types/src/index.ts`: `CoesiteProofBundleView` 공유 타입 추가.
- `packages/sdk/src/index.ts`: RedGate proof 조회 SDK 메서드와 타입 가드 추가.
- `packages/api/test/e2e/app-module-runtime.e2e.test.ts`: Guard → RedGate proof lookup E2E 추가.
- `packages/api/src/proof-gate/*.test.ts`, `packages/api/src/red-gate/red-gate.service.test.ts`, `packages/api/src/contracts/guard.controller.test.ts`, `packages/api/src/common/mvp-runtime.test.ts`, `packages/sdk/test/client.test.ts`: 회귀 테스트 추가/수정.
- `docs/openapi.yaml`, `README.md`, `docs/MVP-LAUNCH-CHECKLIST.md`: API/SDK/운영 게이트 문서 갱신.

## 검증 결과

- `pnpm -r exec tsc --noEmit`: PASS
- `TMPDIR=/tmp pnpm test -- packages/api/src/proof-gate packages/api/src/red-gate packages/api/src/contracts/guard.controller.test.ts packages/api/src/common/mvp-runtime.test.ts packages/sdk/test/client.test.ts`: PASS, 24 files / 319 tests
- `TMPDIR=/tmp pnpm test:e2e`: PASS, 2 files / 15 tests
- `pnpm -r build`: PASS
- `TMPDIR=/tmp pnpm test`: PASS, 24 files / 319 tests
- `bash scripts/scan-principles.sh`: PASS, P1~P10 all passed
- `bash scripts/security-wall.sh`: PASS, critical/high/medium 0
- `bash scripts/secret-scan.sh`: PASS
- `pnpm audit --audit-level moderate`: PASS, no known vulnerabilities
- OpenAPI YAML parse: PASS, 2 paths / 9 schemas
- `pnpm --filter @coesite/sdk pack --dry-run`: PASS
- `DATABASE_URL=postgresql://user:pass@localhost:5432/coesite pnpm exec prisma validate --schema=prisma/schema.prisma`: PASS

## 리스크 / 미해결

- 현재 ProofBundle durable adapter는 JSONL append path다. 운영 판매 전에는 DB trigger + S3 Object Lock writer로 교체 또는 sidecar 연결이 필요하다.
- RedGate audit key rotation/onboarding/offboarding runbook은 문서화 필요하다.
- PreviewBudget은 in-memory MVP counter다. 다중 인스턴스 운영 전 Redis atomic adapter가 필요하다.
- 장시간 독립 RedTeam/Mythos 검증은 이번 구현 게이트에서 자동화하지 않았고, 파일럿 전 별도 Deep Review로 남긴다.
