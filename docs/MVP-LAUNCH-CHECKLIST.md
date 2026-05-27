# Coesite Paid MVP Launch Checklist

## 결론

Coesite paid MVP의 판매 가능 기준은 "실행을 대신 판단하지 않고, 요청 단위 보안
control signal을 안정적으로 반환한다"이다. 기본 흐름은 생성 → 검증 → 승인 → 실행을
유지한다.

제품의 5W1H 정의와 고객에게 팔 수 있는 약속은
[`docs/05-PRODUCT-DEFINITION.md`](05-PRODUCT-DEFINITION.md)를 canonical source로 둔다.

## 판매 가능 범위

- Runtime Seyer `/v1/guard/verify` API
- RedGate `/v1/redgate/proofs/{requestId}` auditor proof API
- TypeScript SDK `CoesiteClient.verifyGuard` / `getProofBundle`
- PROCEED/BLOCK control signal
- Trace/policy/audit evidence reference
- ReleaseContract-validated ProofBundle hash chain
- Fail-closed SDK behavior
- TokenNorm, MetaLayer, Turing Boundary, Trust Cube core 연결

## 판매 전 필수 설정

- `COESITE_POLICY_HMAC_KEY`: KMS 또는 secret manager에서 주입
- `COESITE_RESPONSE_HMAC_KEY`: API 응답 receipt 서명용 secret manager 주입
- `COESITE_API_KEYS`: 고객별 API key를 secret manager에서 주입
- `COESITE_REDGATE_AUDIT_KEYS`: 감사자 전용 API key를 customer key와 분리 주입
- `COESITE_API_KEY_REGISTRY`: 고객별 action scope / subjectPrefix / tenant binding 설정
- `COESITE_WORM_APPEND_PATH`: 운영 append-only/WORM writer 경로 또는 sidecar mount
- `COESITE_PROVENANCE_APPEND_PATH`: provenance append-only writer 경로 또는 sidecar mount
- `COESITE_PROOF_BUNDLE_APPEND_PATH`: ProofBundle append-only/WORM writer 경로 또는 sidecar mount
- `COESITE_ALLOWED_ACTIONS`: 고객 계약 범위에 맞춰 최소 action만 등록
- API key 발급/회수 절차: 고객별 key 분리
- 로그 보존 기간: 계약서와 `SECURITY.md`에 명시
- WORM 저장소: 운영 전 DB/S3 writer 어댑터 연결
- `NODE_ENV=production` 또는 `COESITE_ENV=production`에서 secret 누락 시 부팅 실패 확인
- 고위험 action은 서명된 `humanApproval` artifact 없이는 BLOCK 확인

## 파일럿 계약에 명시할 한계

- Coesite는 AI 최종 판단자가 아니라 보안 보조 control layer다.
- PROCEED는 법적 승인이나 사업 승인 뜻이 아니다.
- 고객 시스템은 BLOCK을 반드시 fail-closed로 처리해야 한다.
- 운영 초기에는 shadow mode와 blocking mode를 고객별로 분리 적용한다.

## 런칭 전 게이트

- `docs/05-PRODUCT-DEFINITION.md` 5W1H와 고객 계약 문구 정합성 확인
- `pnpm -r build`
- `pnpm -r exec tsc --noEmit`
- `TMPDIR=/tmp pnpm test`
- `TMPDIR=/tmp pnpm test:e2e`
- OpenAPI YAML parse + `/v1/redgate/proofs/{requestId}` schema 확인
- `pnpm --filter @coesite/sdk pack --dry-run`
- `SCAN_DIR=. bash scripts/scan-principles.sh`
- `bash scripts/security-wall.sh`
- `bash scripts/secret-scan.sh`
- `pnpm audit --audit-level moderate`

## NO-GO 조건

- Guard API가 위험 요청에 PROCEED를 반환함
- Guard API가 missing/invalid API key에 PROCEED 또는 200을 반환함
- 외부 `context`가 session/budget/trust/approver/source IP/fingerprint를 바꿈
- SDK가 invalid response를 PROCEED로 해석함
- SDK가 receipt 없는 200 응답을 PROCEED로 해석함
- P1~P10 scan 실패
- Security Wall 실패
- Secret scan 실패
- Dependency audit moderate 이상 실패
- WORM/provenance/ProofBundle evidence ref 누락
- RedGate proof view가 raw context, raw subjectRef, raw resource를 노출함
- production/staging에서 WORM/provenance/ProofBundle append path 없이 부팅됨
- 런칭 체크리스트에 실제 게이트 출력 기록 누락
- 제품 정의와 실제 API/SDK 동작이 불일치함

## 다음 운영화 작업

- Redis atomic velocity/session budget adapter
- Prisma policy adapter
- WORM DB/S3 writer
- Customer API key registry with tenant/action binding
- RedGate key rotation and auditor onboarding runbook
- 장시간 RedTeam/Mythos 검증
