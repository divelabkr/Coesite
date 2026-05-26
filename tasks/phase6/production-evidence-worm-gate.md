# Phase 6 — Production Evidence/WORM Gate

## 목적

ProofBundle, Provenance, WORM evidence append path가 단순 파일쓰기에서 끝나지 않도록 재시작 복원, tamper 감지, replay/duplicate 차단을 추가한다.

## 계획 대비 진행

| 항목 | 상태 | 근거 |
|---|---|---|
| Work Order | Approved | 사용자 `진행해` |
| Phase A 이해 확인 | Done | 대상: ProofBundle/Provenance/WormLog append adapter |
| 구현 | Done | append-log load/verify/replay 차단 구현 |
| 단위 검증 | PASS | focused vitest 16 tests PASS |
| 교차검증 | PASS | tsc/test/e2e/build/scan/audit/prisma PASS |
| 최종 요약 | Done | `docs/codex-log/2026-05-27-0600-production-evidence-worm-gate.md` |
| 사람 게이트 | Pending | 최종 보고 후 판단 |

## 범위

- `packages/api/src/proof-gate/proof-bundle.service.ts`
- `packages/api/src/turing/provenance-chain.service.ts`
- `packages/api/src/trust-cube/worm-log.service.ts`
- 각 서비스 테스트

## 검증 기준

- append path가 있으면 기존 JSONL을 부팅 시 로드한다.
- 기존 JSONL hash chain이 깨지면 constructor 단계에서 fail-closed 한다.
- 중복 requestId proof replay를 재시작 후에도 차단한다.
- malformed JSONL line은 fail-closed 한다.
- 기존 broad gates를 유지한다.

## 제외

- 실제 AWS S3 Object Lock / Terraform 구현은 이번 배치 제외.
- PostgreSQL trigger runtime 검증은 Docker/DB 운영 게이트에서 별도 처리.
