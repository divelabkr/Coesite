## 무엇을 했나

보안 프로그램 관점에서 남아 있던 paid-MVP 차단 항목을 추가로 마감했다. 단순 문서 체크가 아니라 API/SDK/증거 경계에 실제 코드와 회귀 테스트를 붙였다.

이번 변경 후 Coesite Guard는 다음을 강제한다.

- API key는 action scope와 subject prefix에 묶인다.
- 고위험 action은 서명된 `humanApproval` artifact가 없으면 SoD 단계에서 BLOCK된다.
- `/v1/guard/verify` 200 응답은 HMAC receipt를 포함하고, SDK는 receipt가 없거나 변조된 응답을 fail-closed 처리한다.
- production/staging은 policy key, response signing key, API key, WORM/provenance append path 누락 시 fail-fast 한다.
- WORM/provenance는 인메모리만 쓰는 운영 기동을 막고, 설정된 append-only JSONL 경로에 기록한다.

## 왜

직전 RedTeam 결과에서 다음 항목이 남아 있었다.

- API key가 단순 존재 확인 수준이라 tenant/action binding이 약했다.
- SDK가 API의 unsigned 200 응답을 신뢰할 수 있었다.
- HumanGate가 실제 Runtime Seyer 경로에 artifact로 묶이지 않았다.
- WORM/provenance evidence가 process memory에만 남아 운영 재시작·pod 교체에 취약했다.
- 문서/OpenAPI가 response receipt와 HumanGate artifact 계약을 반영하지 않았다.

## 변경 파일

- `packages/types/src/index.ts`
  - `CoesiteGuardReceipt`와 `CoesiteGuardResponse.receipt` 추가.
- `packages/utils/src/guard-receipt.ts`
  - Guard response HMAC receipt 생성/검증 유틸 추가.
- `packages/utils/src/index.ts`
  - receipt 유틸 export 추가.
- `packages/utils/test/guard-receipt.test.ts`
  - receipt 정상 검증과 control tampering 탐지 테스트 추가.
- `packages/api/src/common/mvp-runtime.ts`
  - scoped API key registry, response signing key, HumanGate approval HMAC, production append path fail-fast 추가.
  - signed HumanGate approval artifact 생성/검증 helper 추가.
- `packages/api/src/common/mvp-runtime.test.ts`
  - response key/append path production fail-fast, scoped registry, HumanGate artifact binding 테스트 추가.
- `packages/api/src/contracts/guard.controller.ts`
  - API key scope/subject binding 적용.
  - high-risk action HumanGate artifact 검증 후 approverRefs를 Runtime Seyer에 전달.
  - response receipt signing 적용.
- `packages/api/src/contracts/guard.controller.test.ts`
  - scope mismatch, subjectPrefix mismatch, missing/signed HumanGate artifact 회귀 추가.
- `packages/api/src/turing/provenance-chain.service.ts`
  - `COESITE_PROVENANCE_APPEND_PATH` append-only 기록 추가.
- `packages/api/src/turing/provenance-chain.service.test.ts`
  - provenance JSONL append 테스트 추가.
- `packages/api/src/trust-cube/worm-log.service.ts`
  - `COESITE_WORM_APPEND_PATH` append-only 기록 추가.
- `packages/api/src/trust-cube/worm-log.service.test.ts`
  - WORM JSONL append 테스트 추가.
- `packages/sdk/src/index.ts`
  - `responseVerificationKey` 필수화.
  - receipt 없는/변조된 200 응답 fail-closed 처리.
- `packages/sdk/test/client.test.ts`
  - signed response, invalid receipt, required verification key 테스트 추가.
- `packages/sdk/package.json`
  - `@coesite/utils` dependency 추가.
- `docs/openapi.yaml`
  - bearer auth, receipt schema, HumanGate artifact schema, context reserved key 계약 반영.
- `README.md`
  - SDK verification key, response HMAC key, append path 운영 요구 반영.
- `docs/MVP-LAUNCH-CHECKLIST.md`
  - scope binding, response receipt, append path, HumanGate artifact NO-GO 조건 반영.
- `pnpm-lock.yaml`
  - SDK workspace dependency 정합성 갱신.

## 검증 결과

- `pnpm install --lockfile-only --store-dir /tmp/pnpm-store`: sandbox network 제한으로 실패 후 권한 승격 재실행 PASS.
- `CI=true pnpm install --store-dir /tmp/pnpm-store`: PASS. `node_modules` workspace link 복구.
- `DATABASE_URL=... pnpm exec prisma generate --schema=prisma/schema.prisma`: sandbox cache 권한으로 실패 후 권한 승격 재실행 PASS.
- `pnpm -r exec tsc --noEmit`: PASS.
- `pnpm -r build`: PASS.
- Targeted tests:
  - `TMPDIR=/tmp pnpm exec vitest run packages/api/src/contracts/guard.controller.test.ts`: PASS, 12 tests.
  - `TMPDIR=/tmp pnpm exec vitest run packages/api/src/common/mvp-runtime.test.ts`: PASS, 7 tests.
  - `TMPDIR=/tmp pnpm exec vitest run packages/sdk/test/client.test.ts packages/utils/test/guard-receipt.test.ts`: PASS, 9 tests.
  - `TMPDIR=/tmp pnpm exec vitest run packages/api/src/trust-cube/worm-log.service.test.ts packages/api/src/turing/provenance-chain.service.test.ts`: PASS, 2 tests.
  - `TMPDIR=/tmp pnpm exec vitest run packages/api/test/e2e/app-module-runtime.e2e.test.ts`: PASS, 13 tests, 권한 승격.
- Full suite:
  - `TMPDIR=/tmp pnpm test`: sandbox에서는 e2e port bind `EPERM`으로 실패.
  - 권한 승격 재실행 PASS — 21 files, 303 tests.
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS.
- `bash scripts/security-wall.sh`: PASS.
- `bash scripts/secret-scan.sh`: PASS.
- `pnpm audit --audit-level moderate`: PASS, no known vulnerabilities.
- `python3 -c "import yaml; ... docs/openapi.yaml"`: PASS.
- `pnpm --filter @coesite/sdk pack --dry-run`: PASS.

## 리스크 / 미해결

- 프론트엔드 앱은 이 repo에 별도 구현되어 있지 않다. 현재 end-to-end는 API + SDK + OpenAPI 계약 기준으로 검증했다.
- JSONL append adapter는 production misconfiguration을 막는 MVP durable evidence layer다. 최종 운영 강도는 DB WORM trigger + S3 Object Lock writer로 교체해야 완전해진다.
- API key registry는 env JSON 기반이다. 고객 수가 늘면 DB/KMS-backed registry와 rotation audit로 승격해야 한다.
- HumanGate artifact는 HMAC binding까지 구현했다. 실제 BioAuth 발급 UI/API와 2인 승인 운영 채널은 별도 제품 흐름으로 연결해야 한다.
- response receipt는 HMAC 기반이다. 외부 공개 검증 모델이 필요하면 Ed25519 public-key verification으로 교체하는 것이 더 좋다.
