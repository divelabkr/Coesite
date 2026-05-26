# Evidence Chain Stale Writer Hardening

## 무엇을 했나
- 결론: ProofBundle, ProvenanceChain, WormLog, SIREN Honeypot 증거 체인의 stale writer fork 취약점을 회귀 테스트로 재현한 뒤 공통 append-lock adapter로 닫았다.
- 해시가 유효한 중복 ProofBundle `requestId`가 검증을 통과하던 문제를 차단했다.
- JSONL append 경로는 이제 `lock -> latest load -> verify -> create -> verify(next) -> append -> unlock` 순서로 동작한다.

## 왜
- 기존 durable append 구현은 서비스 생성 시점의 메모리 head를 계속 사용했다.
- 같은 append 파일을 바라보는 stale service instance가 나중에 기록하면 `prevHash`가 `GENESIS`로 갈라져 재시작 시 체인 검증이 실패했다.
- ProofBundle은 체인 해시가 맞으면 같은 `requestId`가 두 번 들어와도 `verify()`가 통과해서 감사 조회·증거 의미가 모호해질 수 있었다.
- SIREN honeypot 접근 체인은 해커 유도/탐지 증거인데 순수 메모리 체인이라 재시작과 다중 인스턴스에 약했다.

## 변경 파일
- `packages/api/src/common/append-only-jsonl.ts`
  - atomic lock file 기반 `appendVerifiedJsonlRecord()` 추가.
  - append 직전 최신 JSONL을 다시 읽고 전체 체인을 검증하도록 변경.
  - lock timeout/release 실패는 명시 에러로 fail-closed 처리.
- `packages/api/src/proof-gate/proof-bundle.service.ts`
  - durable append 경로에서 최신 records를 lock 내부에서 재로드하도록 변경.
  - `verifyProofBundleRecords()`에 중복 `requestId` 거부 추가.
- `packages/api/src/turing/provenance-chain.service.ts`
  - durable append 경로에서 최신 head 기준으로 `prevHash`를 계산하도록 변경.
- `packages/api/src/trust-cube/worm-log.service.ts`
  - durable append 경로에서 최신 head 기준으로 `prevHash`를 계산하도록 변경.
- `packages/api/src/meta-layer/siren/honeypot.service.ts`
  - `COESITE_HONEYPOT_APPEND_PATH` / `HoneypotOptions.appendPath` 기반 durable append 지원 추가.
  - 재시작 시 기존 honeypot access records를 로드하고 검증하도록 변경.
- `packages/api/src/meta-layer/siren/types.ts`
  - `HoneypotOptions.appendPath` 추가.
- 테스트 파일
  - stale writer fork 회귀 테스트 추가.
  - hash-valid duplicate `requestId` 회귀 테스트 추가.

## 회귀 재현 -> 수정 흐름
1. 재현 테스트 추가:
   - `packages/api/src/proof-gate/proof-bundle.service.test.ts`
   - `packages/api/src/turing/provenance-chain.service.test.ts`
   - `packages/api/src/trust-cube/worm-log.service.test.ts`
   - `packages/api/src/meta-layer/siren/siren.service.test.ts`
2. 테스트 실행(수정 전): FAIL
   - stale worker가 최신 append head를 보지 못해 `prevHash: GENESIS`로 fork.
   - ProofBundle `verify([first, duplicate])`가 `true`를 반환.
3. 수정 위치:
   - `packages/api/src/common/append-only-jsonl.ts`
   - 각 evidence/WORM 서비스 append 경로
4. 테스트 실행(수정 후): PASS
   - focused evidence/WORM/SIREN: 66 passed
   - 전체 unit: 343 passed
   - E2E: 21 passed
5. 회귀 방지 추가 케이스:
   - stale active/stale service instance가 같은 append file에 기록해도 두 번째 record의 `prevHash`가 첫 번째 `hash`를 가리키는지 검증.
   - 재시작한 service가 append log를 정상 verify하는지 검증.
   - ProofBundle에서 hash-valid duplicate `requestId`가 거부되는지 검증.

## 검증 결과
- `npm test -- packages/api/src/meta-layer/siren/siren.service.test.ts packages/api/src/common/append-only-jsonl.test.ts packages/api/src/proof-gate/proof-bundle.service.test.ts packages/api/src/turing/provenance-chain.service.test.ts packages/api/src/trust-cube/worm-log.service.test.ts`: PASS, 66 tests
- `npm run lint`: PASS, TypeScript noEmit 0 errors
- `npm run build`: PASS
- `npm test`: PASS, 25 files / 343 tests
- `npm run test:e2e`: PASS, 2 files / 21 tests
- `bash scripts/scan-principles.sh`: PASS, P1~P10 all OK
- `bash scripts/security-wall.sh`: PASS
- `bash scripts/secret-scan.sh`: PASS
- `pnpm audit`: PASS, no known vulnerabilities

## 리스크 / 미해결
- JSONL append-lock는 단일 host/local filesystem 기준의 MVP 방어다. 다중 host, 컨테이너 scale-out, 네트워크 파일시스템, 악의적 운영자 삭제까지 완전한 WORM 보장은 아니다.
- 실제 유료 운영에서는 Postgres append-only transaction, S3 Object Lock COMPLIANCE, KMS 분리, append log 복제 검증이 다음 단계다.
- `VelocityThrottleService`, `HumanGateService`의 in-memory Map은 다중 인스턴스에서 우회 여지가 있다. 현재 스캔에서 확인했고, Redis/DB 기반 shared limiter와 approval state로 분리하는 후속 P1이 필요하다.
- Honeypot known route registry는 아직 메모리 기반이다. 접근 증거는 durable해졌지만, 재시작 후 과거 decoy path를 계속 수락해야 하는 요구가 생기면 route registry도 append/durable 저장소가 필요하다.
