# P1~P3 보안 게이트 마스터 플랜

**목표:** Phase 3까지 검증 가능한 핵심 보안 게이트를 누락 없이 구현한다.
**현재 기준점:** `P1.2 OraclePrevention final` 완료, `P1.2-sub2`는 보정 전.
**원칙:** 기능 추가보다 검증 가능성, fail-closed, 사람 승인 게이트, 회귀 방지를 먼저 둔다.

> 주의: Phase 3 완료 시점은 Trust Cube Core까지다. S3 Object Lock 기반 이중 WORM과 외부 감사는 Phase 5 범위이므로, Phase 3 산출물을 “완전한 최종 보안 완성”으로 주장하지 않는다.

---

## 0. 현재 위치

| 항목 | 값 |
|---|---|
| branch | `main` |
| HEAD | `a0b026af9462a9210a17289edede6f8433002ead` |
| worktree | `/mnt/c/My_Project/Coesite` |
| 구현 완료 | P0 Foundation, P1.1 TokenNorm, P1.2 OraclePrevention final |
| 현재 차단 | P1.2-sub2 workorder 보정 필요 |
| 마지막 실검증 | 2026-05-25 진행 점검 기준 build/tsc/test/e2e/scan/security-wall PASS |

---

## 0.5 다중 Codex 사전 검토 결론

| 축 | 결론 | P0/P1 요지 |
|---|---|---|
| Test Sentinel | CONDITIONAL GO | coverage 80% 미강제, fast/heavy gate 미분리, Phase 2/3 테스트 없음 |
| Schema Keeper | CONDITIONAL GO | OpenAPI 부재, shared type 공백, Phase 2/3 schema 부재, DB runtime role 미검증 |
| DNA/Mythos | NO-GO | P1.2-sub2 미해결, Phase 1 체인 미완성, scan GREEN 과신 위험 |
| Security Warden | Pending | 보안 공격 시나리오 검토 진행 중 |

**종합 결론:** Phase 1 잔여 계획 수립은 GO, Phase 3 구현 착수는 NO-GO다. P1.2-sub2와 Phase 1 MetaLayer chain을 먼저 닫고, Phase 2/3 진입 전 schema/type/OpenAPI/test gate를 보강한다.

---

## 1. 게이트 수 요약

### 1.1 프로젝트 Phase 게이트

| 구분 | 개수 | 범위 |
|---|---:|---|
| 필수 Phase 게이트 | 7 | Phase 0~6 |
| 선택 감사 게이트 | 1 | Phase 7 |
| 현재 목표 범위 | 4 | Phase 0~3 중 Phase 3까지 |
| 이미 지난 Phase 게이트 | 1 | Phase 0 |
| 남은 목표 Phase 게이트 | 3 | Phase 1, Phase 2, Phase 3 |

### 1.2 작업 단위 운영 게이트

모든 LARGE 작업은 아래 8단계를 통과해야 한다.

| # | 게이트 | 목적 |
|---:|---|---|
| 1 | Work Order | 범위·금지·영향 맵 고정 |
| 2 | Pre-Phase A | 작업지시 결함 8종 사전 검토 |
| 3 | Phase A | 구현자 이해 확인 + 영향 맵 5축 재대조 |
| 4 | Regression First | 버그·보강 작업은 실패 테스트 먼저 |
| 5 | Implementation | 영향 맵 안에서만 구현 |
| 6 | Command Gates | build/tsc/test/e2e/scan/security-wall |
| 7 | Multi-AI Review | Codex-Reviewer/Gemini/RedTeam/Mythos |
| 8 | HumanGate | GO / CONDITIONAL GO / NO-GO |

**보강:** 게이트 GREEN은 안전의 충분조건이 아니다. scan은 패턴·존재 확인을 포함하므로, 각 P원칙은 반드시 behavior test 또는 e2e 근거와 연결한다.

### 1.3 명령 검증 게이트

기본 명령 게이트는 6개다. Phase별 추가 게이트는 각 작업표에 붙인다.

| # | 명령 | 기준 |
|---:|---|---|
| 1 | `pnpm -r build` | 0 오류 |
| 2 | `pnpm -r exec tsc --noEmit` | 0 오류 |
| 3 | `TMPDIR=/tmp pnpm test` | 100% 통과 |
| 4 | `TMPDIR=/tmp pnpm test:e2e` | 100% 통과 |
| 5 | `bash scripts/scan-principles.sh` | P1~P10 위반 0 |
| 6 | `bash scripts/security-wall.sh` | Critical/High/Medium 0 또는 정책상 허용 |

**P0 보강 명령**
- `pnpm test -- --coverage` 또는 동등한 coverage gate를 도입한다. 문서 기준 80%가 현재 CI에 강제되지 않기 때문이다.
- heavy/nightly gate를 fast PR gate와 분리한다. memory/DoS/concurrency/timing 통계는 fast gate에 무리하게 넣지 않는다.

---

## 2. Phase 1 남은 보안 게이트

Phase 1의 남은 목표는 META-LAYER 3.0을 완성하는 것이다. 현재 W1의 TokenNorm/OraclePrevention은 구현됐지만 P1.2-sub2 보강이 남아 있으므로, Phase 1 완료 판정은 아직 불가하다.

| Gate ID | 작업 | 상태 | 차단 기준 | 핵심 검증 |
|---|---|---|---|---|
| P1-G0 | P1.2-sub2 OraclePrevention hardening | Pending | EML/size/header/time leak 미해결 | 동일 finding 반복, 4096 byte cap, JSON 무결성, header clear |
| P1-G1 | M-1 AllowList + policy loader | Pending | allowlist 실패 시 ALLOW fallback | signed policy, TTL, stale policy deny |
| P1-G2 | GTED rule distance gate | Pending | 거리 계산 DoS, 불명확 threshold | cap, deterministic threshold, edge vectors |
| P1-G3 | SemanticFirewall + MirrorModel | Pending | AI 판단처럼 동작, rule provenance 누락 | rule-only, source map, OWASP LLM vectors |
| P1-G4 | SIREN + DeceptionGate + Honeypot | Pending | decoy가 판단/실행으로 오인됨 | honeypot isolation, no side-effect, attestation log |
| P1-G5 | MetaLayerGuard 통합 | Pending | 개별 모듈은 통과하나 chain 우회 | chain order e2e, fail-closed matrix |
| P1-G6 | Audit/WORM contract interface | Pending | Phase 5 전까지 audit 기록 계약이 비어 있음 | append-only helper interface, prevHash required, no silent log skip |

**Phase 1 완료 조건**
- P1-G0~P1-G5 모두 Done.
- Audit/WORM 실구현이 Phase 5라 하더라도 Phase 1에서는 최소 기록 contract와 fail-closed interface가 있어야 함.
- 누적 unit/e2e 테스트 100+ 또는 동등한 위험 기반 커버리지.
- 실패/거부/404/422/500/middleware exception 전부 OraclePrevention 경로.
- 모든 공격성 입력은 rule-only signal로 기록하고, AI가 최종 판단하지 않음.

---

## 3. Phase 2 보안 게이트

Phase 2의 목적은 Turing Boundary다. 사람 승인 채널, 세션 예산, provenance, shadow 격리를 만든다.

| Gate ID | 작업 | 상태 | 차단 기준 | 핵심 검증 |
|---|---|---|---|---|
| P2-G1 | TB-1 CognitiveFingerprint | Pending | fingerprint가 식별자로 과노출 | collision test, redaction, privacy cap |
| P2-G2 | TB-2 ProvenanceChain + SecurityDNA | Pending | prevHash 없는 기록, chain 단절 무시 | genesis, continuity, break detection |
| P2-G3 | TB-3 VelocityThrottle + SessionBudget | Pending | Redis race, budget bypass | atomic counter, multi-window, concurrent e2e |
| P2-G4 | TB-4 ShadowMode / ImmuneIsolation | Pending | 격리 세션이 실제 DB/외부 호출 수행 | no side-effect proof, outbox block |
| P2-G5 | TB-5 HumanGate channel separation | Pending | HumanGate가 agent toolCall로 등록 | tool registry scan, separate key/config, PeerVerify |
| P2-G6 | Phase 2 schema/type/OpenAPI gate | Pending | provenance/session/human gate 모델 부재 | shared DTO, OpenAPI stub, migration plan |

**Phase 2 완료 조건**
- 세션/예산/격리/승인 모두 fail-closed.
- HumanGate는 agent toolCall 목록에서 자동 스캔으로 제외 확인.
- provenance chain break 시 P10 연계 hook이 생기고, 실제 ALLOW로 폴백하지 않음.
- 동시성 테스트가 race를 재현하고 방어함.

---

## 4. Phase 3 보안 게이트

Phase 3의 목적은 Trust Cube Core다. L0/L1/L2와 ConsensusGate를 만든다.

| Gate ID | 작업 | 상태 | 차단 기준 | 핵심 검증 |
|---|---|---|---|---|
| P3-G1 | L0 MultiRoot + SPIFFE + MCPGateway | Pending | 단일 provider 성공만으로 trust 부여 | 2-of-3, provider failure, identity binding |
| P3-G2 | L1 ComplyGate + HMAC + DualSign + FPV | Pending | 단일 서명/검증 생략 | dual sign, canonical payload, replay block |
| P3-G3 | C-2 DMS + IncidentGovernor | Pending | dry-run 없이 실제 trigger, WORM 누락 | dry-run, DmsTriggerLog prevHash, escalation matrix |
| P3-G4 | L2 Seyer Gate Chain + TrustMetabolism | Pending | step skip, trust decay 누락 | ordered chain, cron, sigmoid bounds |
| P3-G5 | ConsensusGate P10 | Pending | 1 engine 장애 시 allow, 시간 leak | 3 engines, 2-of-3, fail-closed, OraclePrevention timing |
| P3-G6 | Phase 3 schema/type/OpenAPI gate | Pending | L0/L1/L2 vote/evidence 모델 부재 | quorum result, dual sign evidence, vote record DTO |

**Phase 3 완료 조건**
- 어떤 행동도 단일 엔진/단일 서명/단일 provider만으로 허용되지 않음.
- 1개 엔진 장애는 fail-closed 또는 명시적 deny.
- TrustMetabolism은 5분 cron과 baseline 갱신 테스트가 있음.
- ConsensusGate 응답은 P8 균일화 경로를 사용함.
- Phase 5 전 한계 명시: S3 Object Lock 이중 WORM과 외부 감사는 아직 미완성임.

---

## 5. 교차검증 계획

| 시점 | Codex-Reviewer | Gemini | RedTeam | Mythos |
|---|---|---|---|---|
| 각 workorder 작성 후 | 필수 | 필수 | 보안 인접 시 필수 | 변곡점이면 필수 |
| 각 Phase 완료 직전 | 필수 | 필수 | 필수 | 필수 |
| migration/schema 변경 | 필수 | 선택 | 선택 | 필수 |
| HumanGate/Consensus 변경 | 필수 | 필수 | 필수 | 필수 |

검토 결과가 서로 다르면 Codex-Orchestrator가 낮은 위험 쪽으로 평균내지 않는다. **더 보수적인 차단 의견을 기본값**으로 삼고 사람 게이트에 올린다.

---

## 6. 메모리·DoS·누락 방어 원칙

| 리스크 | 방어 |
|---|---|
| 대형 payload로 memory spike | body size cap, streaming 금지 구간 명시, fixture 기반 stress test |
| deep object / recursive input | max depth, max key count, fixed-point loop cap |
| token explosion | normalization expansion ratio cap, per-stage budget |
| Redis race | atomic script 또는 transaction, concurrent e2e |
| test hang | per-test timeout, heavy test 분리, no background server leak |
| false GREEN | command gate + behavior e2e + read-only review를 분리 |
| missing audit | audit/WORM insert helper 강제, prevHash test |
| oracle leak | status/body/header/time/size uniform matrix |
| coverage illusion | line coverage 80% + critical behavior matrix를 함께 요구 |
| OpenAPI/type drift | route ↔ OpenAPI ↔ shared DTO 비교 gate |
| DB role drift | runtime role connection test, owner-only migration test |

---

## 7. 구현 순서

### Batch A — P1.2-sub2 보정과 구현
1. workorder 보정.
2. Pre-Phase A 다중 검토.
3. EML nonce/mask, size cap, header clear, request clock 보강.
4. regression-first 테스트.
5. full command gates.

### Batch A-1 — Test/Schema gate foundation
1. coverage gate를 CI/스크립트에 반영할지 결정.
2. fast gate와 heavy/nightly gate 분리.
3. `packages/api/test/fixtures/` 구조 확정.
4. `docs/openapi.yaml` skeleton 생성 기준 확정.
5. `packages/types` shared DTO가 비어 있는 문제 해결 계획 확정.

### Batch B — Phase 1 W2
1. AllowList policy loader.
2. GTED deterministic gate.
3. SemanticFirewall rule map.
4. MirrorModel no-judgment adapter.
5. MetaLayer partial integration.

### Batch C — Phase 1 W3
1. SIREN signal model.
2. DeceptionGate no-side-effect decoy.
3. Honeypot route isolation.
4. MetaLayerGuard full chain.
5. Phase 1 completion gate.

### Batch D — Phase 2
1. Fingerprint and provenance schema/type plan.
2. ProvenanceChain + SecurityDNA.
3. VelocityThrottle + SessionBudget.
4. ShadowMode.
5. HumanGate channel separation.
6. Phase 2 completion gate.

### Batch E — Phase 3
1. MultiRoot local/stub provider abstraction.
2. L1 ComplyGate signing and canonical verification.
3. DMS dry-run and IncidentGovernor.
4. L2 chain + TrustMetabolism.
5. ConsensusGate.
6. Phase 3 completion gate.

---

## 8. 예상 기간

원래 로드맵 기준:
- Phase 1 전체: 3주. 현재 W1 대부분 완료, P1.2-sub2와 W2/W3 남음.
- Phase 2: 2주.
- Phase 3: 3주.

현실적인 남은 기간:
- Phase 1 잔여: 2~2.5주.
- Phase 2: 2주.
- Phase 3: 3주.
- 게이트 보강/리뷰 버퍼: 1주.

합계: **약 8~8.5주**.
빠르게 찍어내는 방식이면 줄일 수 있지만, 이 계획에서는 보안·회귀·누락 방어를 우선하므로 단축을 목표로 삼지 않는다.

---

## 9. 현재 NO-GO

아직 Phase 3 구현 착수는 NO-GO다.

이유:
1. P1.2-sub2가 CONDITIONAL GO 상태다.
2. Phase 1 MetaLayer chain이 아직 완성되지 않았다.
3. Phase 2 provenance/HumanGate 없이 Phase 3 trust/consensus를 먼저 만들면 책임 분리와 chain 연속성 검증이 약해진다.
4. OpenAPI/shared type/schema gate가 아직 비어 있다.
5. coverage와 heavy gate가 CI에 강제되지 않는다.

다음 액션은 **Batch A: P1.2-sub2 workorder 보정 및 다중 검토**, 이어서 **Batch A-1: Test/Schema gate foundation**이다.
