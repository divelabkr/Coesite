# 보안 출력 데이터 계약 점검

## 무엇을 했나

Guard 응답, SDK 검증 결과, RedGate proof bundle, OraclePrevention padding이 실제 사용자에게 예상한 보안 데이터 형태로 출력되는지 점검했다.

결론: 최초 E2E에서 Guard 성공 응답에 `_pad` 필드가 노출되는 계약 불일치를 발견했고, padding을 JSON 데이터 필드가 아닌 trailing whitespace로 변경해 수정했다.

## 왜

OpenAPI와 SDK 타입은 Guard 응답과 RedGate proof view에 `additionalProperties: false` 성격의 고정 필드만 허용한다. 그런데 OraclePrevention이 균일 응답 크기를 만들기 위해 `_pad`를 JSON object 안에 넣으면, 고객 SDK나 외부 감사자가 보는 데이터 계약이 오염된다.

P8 균일 응답 크기는 유지해야 하지만, 보안 padding이 사용자 데이터로 보이면 안 된다.

## 변경 파일

- `packages/api/src/common/oracle-prevention/size-padding.util.ts`
  - `_pad` 데이터 필드 삽입을 제거했다.
  - JSON 문자열 뒤 공백으로 K-segment 크기 padding을 유지하도록 변경했다.
  - oversized/circular/BigInt payload fail-closed summary 경로는 유지했다.
- `packages/api/src/common/oracle-prevention/oracle-prevention.service.test.ts`
  - padding 후 `JSON.parse` 결과에 `_pad`가 없고 원래 데이터만 남는 회귀 테스트를 추가했다.
- `packages/api/test/e2e/app-module-runtime.e2e.test.ts`
  - Guard 응답 필드가 `control/evidence/receipt/requestId/signals`만 나오는지 확인했다.
  - receipt algorithm/keyId/payloadHash/signature 형식을 검증했다.
  - RedGate proof view가 raw `subjectRef/resource/partition/ref`를 노출하지 않고 hash/digest만 내는지 확인했다.

## 실제 체크한 보안 데이터

- Guard success output
  - `control: PROCEED`
  - `signals: { riskScore: 0, confidence: 1, flags: ["guard_passed"] }`
  - `evidence`: trace hash + policy ref
  - `receipt`: HMAC-SHA256, keyId, issuedAt, payloadHash hex64, signature hex64
  - `_pad` 미노출
- RedGate proof output
  - `bundleId/contractHash/hash/resourceHash/subjectRefHash/receiptPayloadHash`: hex64
  - `prevHash`: `GENESIS` 또는 hex64
  - `evidence.refHash`: hex64
  - raw `subjectRef`, raw `resource`, raw evidence `ref`, 내부 `partition` 미노출
- SDK flow
  - 정상: Guard verify 후 receipt 검증, proof bundle 조회 PASS
  - 잘못된 response key: fail-closed BLOCK
  - 잘못된 API key: fail-closed BLOCK + proof 미생성
  - 고위험 액션: 승인 없으면 BLOCK, signed approval 있으면 PROCEED
- Uniform rejection
  - unauth Guard/RedGate와 malformed RedGate requestId는 403 + 512-byte uniform body

## 발견한 결함과 수정

1. 결함: Guard 성공 응답 JSON에 `_pad` 필드가 포함됐다.
   - 영향: OpenAPI/SDK 출력 계약과 불일치, 고객이 불필요한 내부 보안 padding을 데이터 필드로 볼 수 있음.
   - 수정: `createPaddedJsonBody`가 JSON object를 변경하지 않고 trailing whitespace로만 content-length를 맞추도록 변경.

## 검증 결과

- 최초 `TMPDIR=/tmp pnpm test:e2e`: FAIL
  - 원인: `Object.keys(body)`에 `_pad` 포함
- `TMPDIR=/tmp pnpm exec vitest run packages/api/src/common/oracle-prevention/oracle-prevention.service.test.ts`: PASS, 12 tests
- `TMPDIR=/tmp pnpm test:e2e`: PASS, 2 files / 21 tests
- `pnpm -r exec tsc --noEmit`: PASS
- `TMPDIR=/tmp pnpm test`: PASS, 24 files / 329 tests
- `pnpm -r build`: PASS
- `bash scripts/scan-principles.sh`: PASS, P1~P10 all passed
- `bash scripts/security-wall.sh`: PASS, Mountain 0 / Mine 0 / Vein 0
- `bash scripts/secret-scan.sh`: PASS
- `pnpm audit --audit-level moderate`: PASS, no known vulnerabilities found
- OpenAPI security output contract parse/check: PASS
- `DATABASE_URL=postgresql://user:pass@localhost:5432/coesite pnpm exec prisma validate --schema=prisma/schema.prisma`: PASS
- `git diff --check`: PASS

## 리스크 / 미해결

- padding은 trailing whitespace 방식이므로 JSON parser에는 보이지 않는다. HTTP client가 raw body를 직접 표시하면 뒤 공백은 보일 수 있지만 데이터 필드는 오염되지 않는다.
- MVP adapter 특성상 proof persistence는 아직 운영 DB/S3 WORM 완성본이 아니다. 유료 운영 전에는 durable adapter 게이트가 별도로 필요하다.
