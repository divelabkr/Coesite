# Phase 4~6 Risk Recheck Log

## Executive Summary

**결론**: CONDITIONAL GO에서 더 강한 GO 쪽으로 보강됨. 재점검 중 ProofBundle append record에 raw subject partition이 남을 수 있는 P1 리스크를 발견해 해시 파티션으로 수정했다.

**발견/수정 P1**:
- ProofBundle record의 `partition.value`가 raw `subjectRef`를 저장할 수 있었음. RedGate view에는 노출되지 않았지만 append-only 파일에 굳을 수 있어 해시값으로 변경.
- 동일 `requestId` 중복 기록 시 RedGate 감사가 모호해질 수 있어 duplicate requestId를 fail-closed 처리.
- RedGate 조회 `requestId`가 비정상적으로 긴 경우 동일 403으로 거절하도록 보강.

**P0 차단 항목**: 없음.

## 무엇을 했나

- `ProofBundleService`에서 partition value를 raw `subjectRef`가 아니라 `subjectRefHash`로 저장하도록 변경.
- append JSONL에 `agent-1`, `doc-1` 같은 raw subject/resource fixture가 남지 않는 회귀 테스트 추가.
- `ProofBundleService`가 중복 `requestId`를 거절하도록 변경.
- `list()`가 내부 배열 참조 대신 복사본을 반환하도록 변경.
- RedGate controller에서 `requestId` trim/length 검증을 추가하고 128자 초과는 uniform 403으로 거절.

## 변경 파일

- `packages/api/src/proof-gate/proof-bundle.service.ts`
- `packages/api/src/proof-gate/proof-bundle.service.test.ts`
- `packages/api/src/red-gate/red-gate.controller.ts`
- `packages/api/test/e2e/app-module-runtime.e2e.test.ts`

## 검증 결과

- `pnpm -r exec tsc --noEmit`: PASS
- `TMPDIR=/tmp pnpm test -- packages/api/src/proof-gate/proof-bundle.service.test.ts packages/api/test/e2e/app-module-runtime.e2e.test.ts`: PASS, 24 files / 321 tests
- `pnpm -r build`: PASS
- `bash scripts/scan-principles.sh`: PASS
- `bash scripts/security-wall.sh`: PASS
- `bash scripts/secret-scan.sh`: PASS
- `pnpm audit --audit-level moderate`: PASS
- OpenAPI parse: PASS

## 리스크 / 미해결

- `requestId`는 여전히 raw correlation key로 API contract에 남는다. 고객 통합 가이드에서 PII를 넣지 못하게 계약/문서로 막아야 한다.
- PreviewBudget은 여전히 in-memory MVP counter라 다중 인스턴스 운영 전 Redis atomic adapter가 필요하다.
- ProofBundle durable adapter는 JSONL append path 기반이다. 실제 판매 운영 전 DB/S3 Object Lock writer 연결이 필요하다.
