## 무엇을 했나

Gemini CLI 외부 레드팀 호출은 코드·보안 설계 외부 전송 위험으로 승인 심사에서 차단되었다. 대신 로컬 다중 Codex RedTeam을 runtime/platform 축으로 분리해 Deep 검증했고, 확인된 P0 일부를 회귀 테스트 먼저 실패시킨 뒤 수정했다.

이번 보강으로 `/v1/guard/verify`는 missing/invalid API key를 런타임 평가 전에 fail-closed 처리하고, 외부 `context`가 session/budget/trust/approver/source IP/fingerprint 입력을 덮어쓰지 못한다. 외부 응답의 실패 단계 노출도 `guard_blocked`로 축소했다.

## 왜

레드팀과 회귀 테스트가 다음 문제를 확인했다.

- API key 없이 allowed action 요청이 `PROCEED`될 수 있었다.
- `context.sessionBudget`, `budgetCost`, `approverRefs`, behavior arrays, `sourceIp`, `trustScore`가 보안 판단 입력으로 승격됐다.
- production/staging에서 `COESITE_POLICY_HMAC_KEY` 또는 `COESITE_API_KEYS` 누락 시 로컬 fallback으로 계속 동작할 위험이 있었다.
- `failed_step:*`와 gate 이름이 외부 oracle로 노출됐다.

## 변경 파일

- `packages/api/src/contracts/guard.controller.ts`
  - Bearer API key 검증 추가.
  - 보안 입력을 외부 `context`가 아니라 서버 기본값/http request에서 파생하도록 변경.
  - session id를 `subjectRef` 기준으로 고정.
  - public 문자열 길이를 128자로 제한.
  - 외부 flags를 `guard_passed` / `guard_blocked`로 축소.
- `packages/api/src/common/mvp-runtime.ts`
  - production/staging secret fallback fail-fast 추가.
  - `COESITE_API_KEYS`, approver refs, 고정 runtime default 설정 추가.
  - 고객 action 설정 시 guard route allow token을 자동 포함.
- `packages/api/src/contracts/guard.controller.test.ts`
  - 회귀 테스트 8개 추가. 수정 전 8개 모두 FAIL 확인, 수정 후 PASS.
- `packages/api/src/common/mvp-runtime.test.ts`
  - production secret 누락 fail-fast와 allowlist route 보존 테스트 추가.
- `packages/api/test/e2e/app-module-runtime.e2e.test.ts`
  - Guard API 인증 헤더 적용, unauthenticated 403 회귀 추가.
  - 외부 flags expectation 갱신.
- `packages/sdk/src/index.ts`
  - `apiKey` 필수화 및 빈 키 생성 차단.
- `packages/sdk/test/client.test.ts`
  - Authorization header, required API key, `guard_passed` response 테스트 갱신.
- `packages/sdk/package.json`
  - paid MVP pack 검증 가능하도록 `0.1.0`, `private: false`로 변경.
- `docs/openapi.yaml`
  - Bearer auth security scheme 추가.
  - request string maxLength, reserved context key 문서화, opaque flags 예시 반영.
- `README.md`
  - `COESITE_API_KEYS` 필수 설정, production secret fail-fast, `TMPDIR=/tmp pnpm test` 게이트 반영.
- `docs/MVP-LAUNCH-CHECKLIST.md`
  - API key, context spoofing, production secret, 실제 게이트 결과 기록 NO-GO 조건 반영.
- `scripts/secret-scan.sh`
  - `README.md`, root `.env`, root `.env.example` 스캔 범위 추가.

## 검증 결과

- Gemini CLI version 확인: `0.42.0`
- Gemini external review: NOT_RUN. 외부 전송 위험으로 승인 심사 차단.
- Local Runtime RedTeam: NO-GO findings 수신.
- Local Platform RedTeam: NO-GO findings 수신.
- 회귀 재현:
  - `TMPDIR=/tmp pnpm test -- packages/api/src/contracts/guard.controller.test.ts`: 환경상 전체 수집으로 실행, 신규 회귀 8개 FAIL 확인.
- 수정 후 좁은 회귀:
  - `TMPDIR=/tmp pnpm exec vitest run packages/api/src/contracts/guard.controller.test.ts`: PASS, 8 tests.
  - `TMPDIR=/tmp pnpm exec vitest run packages/api/src/common/mvp-runtime.test.ts`: PASS, 3 tests.
  - `TMPDIR=/tmp pnpm exec vitest run packages/sdk/test/client.test.ts`: PASS, 5 tests.
- `pnpm -r exec tsc --noEmit`: PASS.
- `pnpm -r build`: PASS.
- `TMPDIR=/tmp pnpm test`: sandbox에서는 e2e port bind `EPERM`으로 FAIL, 권한 승격 재실행 PASS — 18 files, 289 tests.
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS.
- `bash scripts/security-wall.sh`: PASS.
- `bash scripts/secret-scan.sh`: PASS.
- `pnpm audit --audit-level moderate`: PASS, no known vulnerabilities.
- `python3 -c "import yaml; ... docs/openapi.yaml"`: PASS.
- `pnpm --filter @coesite/sdk pack --dry-run`: PASS.

## 리스크 / 미해결

- 아직 완전한 production GO는 아니다. WORM/provenance/evidence가 in-memory인 항목은 P1 blocker로 남아 있다.
- API key는 env 기반 allowlist이며 tenant/action binding, hash-at-rest registry, rotation audit는 아직 없다.
- SDK는 API key를 필수화했지만 signed response/proof verification은 아직 없다.
- runtime DB role 강제, WORM DB/S3 writer, restart/tamper/replay 테스트는 다음 작업에서 닫아야 한다.
- HumanGate approval artifact를 action/resource/requester에 cryptographic binding하는 작업은 아직 별도 P0/P1 후속이다.
