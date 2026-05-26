# Production Evidence/WORM Gate

## 무엇을 했나

ProofBundle, ProvenanceChain, WormLog의 append-only JSONL evidence adapter를 재시작 복원형으로 강화했다.

결론: 기존에는 append path에 기록만 하고 새 service instance가 기존 chain을 읽지 않았다. 이제 append path가 있으면 부팅 시 기존 record를 로드하고, hash chain 검증 실패 또는 malformed JSONL이 있으면 constructor 단계에서 fail-closed 한다.

## 왜

운영/판매 전 evidence path는 단순 기록보다 강해야 한다. 재시작 후 chain head를 잃으면 `prevHash`가 다시 `GENESIS`로 시작할 수 있고, ProofBundle requestId replay/duplicate 차단도 메모리 초기화로 약해진다.

이번 작업은 실제 AWS S3 Object Lock/DB writer 전 단계에서 최소한의 production evidence gate를 닫는 작업이다.

## 변경 파일

- `packages/api/src/common/append-only-jsonl.ts`
  - append-only JSONL loader/writer 공통 유틸 추가.
  - malformed JSON, invalid record, hash-chain verify 실패 시 fail-closed.
- `packages/api/src/common/append-only-jsonl.test.ts`
  - 기존 JSONL 로드, malformed JSONL fail-closed, verify 실패 fail-closed 테스트 추가.
- `packages/api/src/proof-gate/proof-bundle.service.ts`
  - `COESITE_PROOF_BUNDLE_APPEND_PATH`가 있으면 기존 ProofBundle chain 로드.
  - 로드한 chain 검증 실패 시 `proof_bundle_append_log_invalid`.
  - 재시작 후에도 duplicate `requestId` 차단 유지.
- `packages/api/src/proof-gate/proof-bundle.service.test.ts`
  - restart load, duplicate replay 차단, tampered log fail-closed 테스트 추가.
- `packages/api/src/turing/provenance-chain.service.ts`
  - `COESITE_PROVENANCE_APPEND_PATH` 기존 chain 로드.
  - 재시작 후 append가 기존 head hash를 `prevHash`로 이어가도록 변경.
- `packages/api/src/turing/provenance-chain.service.test.ts`
  - restart append continuity, tampered log fail-closed 테스트 추가.
- `packages/api/src/trust-cube/worm-log.service.ts`
  - `COESITE_WORM_APPEND_PATH` 기존 chain 로드.
  - 재시작 후 append continuity 유지.
- `packages/api/src/trust-cube/worm-log.service.test.ts`
  - restart append continuity, tampered log fail-closed 테스트 추가.
- `tasks/phase6/production-evidence-worm-gate.md`
  - 작업 계획/진행표 추가 및 검증 상태 갱신.

## 회귀 재현 → 수정 흐름

1. 재현 테스트 추가:
   - `packages/api/src/proof-gate/proof-bundle.service.test.ts`
   - `packages/api/src/turing/provenance-chain.service.test.ts`
   - `packages/api/src/trust-cube/worm-log.service.test.ts`
2. 테스트 실행(수정 전): FAIL
   - restart service가 기존 append log를 로드하지 못함.
   - restarted append가 다시 `GENESIS`에서 시작함.
   - tampered append log가 constructor에서 차단되지 않음.
3. 수정 위치:
   - `packages/api/src/common/append-only-jsonl.ts`
   - `packages/api/src/proof-gate/proof-bundle.service.ts`
   - `packages/api/src/turing/provenance-chain.service.ts`
   - `packages/api/src/trust-cube/worm-log.service.ts`
4. 테스트 실행(수정 후): PASS
   - focused regression 4 files / 16 tests PASS.
5. 회귀 방지 추가 케이스:
   - malformed JSONL fail-closed.
   - verify callback 실패 fail-closed.
   - ProofBundle duplicate requestId replay after restart.
   - Provenance/WormLog restart continuity.

## 검증 결과

- `TMPDIR=/tmp pnpm exec vitest run packages/api/src/proof-gate/proof-bundle.service.test.ts packages/api/src/turing/provenance-chain.service.test.ts packages/api/src/trust-cube/worm-log.service.test.ts`: RED 확인, 6 failed.
- `TMPDIR=/tmp pnpm exec vitest run packages/api/src/common/append-only-jsonl.test.ts packages/api/src/proof-gate/proof-bundle.service.test.ts packages/api/src/turing/provenance-chain.service.test.ts packages/api/src/trust-cube/worm-log.service.test.ts`: PASS, 4 files / 16 tests.
- `pnpm -r exec tsc --noEmit`: PASS.
- `TMPDIR=/tmp pnpm test`: PASS, 25 files / 338 tests.
- `TMPDIR=/tmp pnpm test:e2e`: PASS, 2 files / 21 tests.
- `pnpm -r build`: PASS.
- `bash scripts/scan-principles.sh`: PASS.
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS.
- `bash scripts/security-wall.sh`: PASS, Mountain 0 / Mine 0 / Vein 0.
- `bash scripts/secret-scan.sh`: PASS.
- `pnpm audit --audit-level moderate`: PASS, no known vulnerabilities found.
- `DATABASE_URL=postgresql://user:pass@localhost:5432/coesite pnpm exec prisma validate --schema=prisma/schema.prisma`: PASS.
- `pnpm --filter @coesite/sdk pack --dry-run`: PASS.
- `git diff --check`: PASS.

## 리스크 / 미해결

- 이번 작업은 JSONL evidence adapter를 restart/tamper/replay에 강하게 만든 것이다. 실제 S3 Object Lock COMPLIANCE writer와 PostgreSQL DB-side trigger runtime 검증은 아직 별도 운영 게이트로 남는다.
- JSONL 파일 자체의 OS-level append-only enforcement는 배포 환경/sidecar/storage policy에서 닫아야 한다.
- Redis atomic adapter와 Prisma policy adapter는 다음 운영화 트랙이다.
