# Coesite MVP P0 — Master Plan v1.0
**DiveLab AI Trust Security Protocol · Claude Code 자율 제작 마스터 로드맵**

---

## 0. 문서 사용법

이 문서는 **클로드 코드 세션의 GPS**다. 새 세션 시작 시 반드시 이 파일을 첫 번째로 읽고, 현재 어느 Phase에 있는지 확인한 후 작업한다.

세션 시작 명령:
```
00-MASTER-PLAN.md → 01-CLAUDE.md → 02-AGENTS.md 순서로 읽고,
현재 Phase 확인 후 03-PROMPTS.md의 해당 프롬프트 자동 실행.
```

---

## 1. 프로젝트 정체성

| 항목 | 값 |
|---|---|
| 제품명 | Coesite (코사이트) |
| 소속 | DiveLab |
| 비전 | TEP defines the threat. Coesite stops it. |
| 슬로건 | 층이 다릅니다 / Break one layer. Meet the next. |
| 이번 작업 범위 | **MVP P0** (Seyer v3 Gate Chain 10단계 + META-LAYER + Turing Boundary + Trust Cube L0~L3 + RedGate + WORM 이중) |
| 제외 범위 | GreenGate, Norn L4, 제한 L3+ 시간 잠금, R-series Regenesis, Mountain급 전체 (Phase P1+ 또는 봉인) |
| 출시 목표 | 2027 Q1 |
| 라이선스 | BSL (Business Source License) |
| 1차 고객 | Facil (별도 세션에서 Phase 6 종료 후 연결) |

---

## 2. 아키텍처 (P0 범위)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Layer 0] DDoS Defense — Cloudflare + AWS Shield (외부 위임)    │
└────────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  [META-LAYER 3.0]                                                │
│  TokenNorm → M-1 AllowList+GTED → SemanticFirewall+MirrorModel  │
│  → M-3 SIREN 3.0 (Polyintent + DeceptionGate + 전경로 허니팟)    │
└────────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  [TURING BOUNDARY]                                               │
│  TB-1 CognitiveFingerprint  TB-2 ProvenanceChain+SecurityDNA    │
│  TB-3 VelocityThrottle+세션예산  TB-4 ImmuneIsolation(Shadow)    │
│  TB-5 HumanGate+BioAuth (채널 분리·toolCall 제외)                 │
└────────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  [TRUST CUBE]                                                    │
│  L0 MultiRoot (2-of-3 AWS/GCP/Azure) + SPIFFE + MCPGateway      │
│  L1 ComplyGate + HMAC + DualSign + FPV + C-2 DMS                 │
│  L2 Seyer + ImmutableBaseline + TrustMetabolism(24h 비선형감쇠)   │
│      + 다중윈도우(10m~30d) + HTC + SessionBoundary                │
│  ConsensusGate: 3엔진 2-of-3 합의 (P10 강제)                      │
│  L3 ProofGate + OutOfBandLog + Heartbeat + ZKBP                  │
│      + preview-first + ReleaseContract + ProofBundle             │
└────────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  [RedGate]                                                       │
│  외부 감사 인터페이스 + WORM 이중(Postgres + S3 Object Lock 7년)  │
└─────────────────────────────────────────────────────────────────┘

[전역 인프라]
QuantumGate(PQC 서명) · OraclePrevention(균일 응답) · AttestationChain(prevHash)
```

**P0에서 빠진 것** (Phase P1+로):
- L4 Norn (Urðr/Verðandi/Skuld 3여신)
- L3+ 제한 시간 잠금
- GreenGate 7-layer (Adversary Game Engine)
- Sin-Pattern Detection Mesh 8축
- 생체 대사 확장 (Autophagy + Coagulation)
- R-series Regenesis Architecture (전부)

---

## 3. 14주 로드맵

### Phase 0 — Foundation (1주)
| Day | 산출물 |
|---|---|
| D1 | Mono-repo 생성 (`packages/api`, `packages/types`, `packages/utils`, `infra/`) |
| D2 | docker-compose (Postgres 16 + Redis 7) 로컬 환경 |
| D3 | Prisma 스키마 v1 (Agent·AuditLog·Policy·Session) + 마이그레이션 |
| D4 | CLAUDE.md·8-agent 정의·scan-principles.sh·CI 훅 등록 |
| D5 | Security Wall 검증 (Mountain급 키워드 차단 훅 테스트) |
| D6 | Phase 0 게이트: `tsc 0 + vitest skel 통과 + scan 0 위반` |
| D7 | 회고 + Phase 1 진입 |

### Phase 1 — META-LAYER 3.0 (3주, SIREN 포함)
| Week | 산출물 |
|---|---|
| W1 | TokenNorm 미들웨어 + OraclePrevention 인터셉터 (응답 시간/크기/형태 균일화) |
| W2 | M-1 AllowList + GTED 거리 기반 거부 + SemanticFirewall + MirrorModel |
| W3 | M-3 SIREN 3.0: Polyintent 분석 + DeceptionGate + 전경로 허니팟 + 게임이론 의도 역전 |
| Gate | tsc 0 + vitest 50+ + scan 0 + 허니팟 E2E 통과 |

### Phase 2 — Turing Boundary (2주)
| Week | 산출물 |
|---|---|
| W1 | TB-1 CognitiveFingerprint + TB-2 ProvenanceChain (prevHash 체인) + SecurityDNA |
| W2 | TB-3 VelocityThrottle + 세션 예산 + TB-4 ShadowMode + TB-5 HumanGate (채널 분리) |
| Gate | tsc 0 + vitest 80+ + scan 0 + HumanGate toolCall 제외 검증 |

### Phase 3 — Trust Cube Core (3주)
| Week | 산출물 |
|---|---|
| W1 | L0 MultiRoot 어댑터 (AWS KMS + GCP KMS + Azure KeyVault 2-of-3) + SPIFFE 어댑터 |
| W2 | L1 ComplyGate (HMAC + DualSign + FPV 수학 검증 + C-2 DMS 트리거) |
| W3 | L2 Seyer (ImmutableBaseline + TrustMetabolism sigmoid 비선형감쇠 + ConsensusGate 3엔진 2-of-3) |
| Gate | tsc 0 + vitest 130+ + scan 0 + ConsensusGate P10 검증 + DMS Dry-Run |

### Phase 4 — ProofGate L3 (2주)
| Week | 산출물 |
|---|---|
| W1 | preview-first 엔진 + ReleaseContract 검증 + PreviewBudget 카운터 |
| W2 | ProofBundle 생성 + ZKBP 통합 + OutOfBandLog + Heartbeat + ApprovalFatigue 탐지 |
| Gate | tsc 0 + vitest 180+ + scan 0 + ProofBundle 무결성 검증 |

### Phase 5 — RedGate + WORM 이중 (1주)
| Day | 산출물 |
|---|---|
| D1~2 | Postgres WORM 트리거 (AuditLog·DmsTriggerLog·AdminActionLog UPDATE/DELETE BEFORE 트리거로 차단) |
| D3~4 | AWS S3 Object Lock COMPLIANCE 7년 + AttestationChain S3 백업 cron |
| D5~6 | RedGate 외부 감사 인터페이스 (read-only) + 감사관 API 키 발급 흐름 |
| D7 | Gate: WORM 우회 시도 100건 자동 테스트 0 통과 |

### Phase 6 — 통합 + SDK + E2E (2주)
| Week | 산출물 |
|---|---|
| W1 | E2E 시나리오 5종 (정상/공격/사고/공모/회복) + Grok adversarial harness 연결 |
| W2 | `@divelab/coesite-guards` SDK 패키지 + OpenAPI 3.1 + README + 30분 통합 가이드 |
| Gate | E2E 100% + SDK 통합 테스트 + OpenAPI 검증 + 최종 보안 감사 |

### Phase 7 — Buffer + 외부 감사 (선택, 0~2주)
- 외부 침투 테스트
- Opus 4.7 peer review
- Grok adversarial 11종 + 추가 시나리오
- 부족분 보강

---

## 4. 의존성 그래프

```
Phase 0 (Foundation)
   │
   ▼
Phase 1 (META-LAYER) ◀────────────────┐
   │                                   │
   ▼                                   │
Phase 2 (Turing Boundary)              │ (의존)
   │                                   │
   ▼                                   │
Phase 3 (Trust Cube Core) ─────────────┤
   │                                   │
   ▼                                   │
Phase 4 (ProofGate L3) ────────────────┤
   │                                   │
   ▼                                   │
Phase 5 (RedGate + WORM) ──────────────┘
   │
   ▼
Phase 6 (통합 + SDK)
   │
   ▼
[Optional] Phase 7 (Buffer)
   │
   ▼
[종료] → Facil 파일럿 별도 세션 시작
```

**역방향 의존 금지**: 후행 Phase에서 선행 Phase 수정 발견 시 → 즉시 작업 중단 → 선행 Phase로 롤백 → 재구현.

---

## 5. 결정 사항 (확정)

| # | 결정 | 사유 |
|---|---|---|
| D1 | SIREN 3.0 P0 포함 (디셉션·허니팟 풀스택) | 차별화 핵심·특허 S-8~S-11 동시 검증 |
| D2 | Facil 파일럿 = Coesite 완료 후 별도 세션 | 컨텍스트 분리·Coesite 순결성 보호 |
| D3 | WORM 이중 (Postgres 트리거 + S3 Object Lock 7년) | 단일 장애점 제거·법적 증거력 최대화 |
| D4 | Mountain급 Tier 1 목록 및 변형 완전 제외 | 메모리 강제 룰·노출 위험 차단 |
| D5 | 8-agent harness + scan-principles.sh + AUTO-DEBUG 7-step 강제 | 기존 자산 활용·일관성 |

---

## 6. 산출물 체크리스트 (최종 완료 기준)

### 코드
- [ ] Mono-repo 4 패키지 빌드 통과
- [ ] tsc --noEmit 0 오류
- [ ] vitest 200+ 케이스 통과
- [ ] scan-principles.sh P1~P10 0 위반
- [ ] E2E 시나리오 5종 100% 통과
- [ ] SDK 패키지 + OpenAPI 3.1

### 문서
- [ ] CLAUDE.md (이 마스터 플랜 포함)
- [ ] OpenAPI 3.1 명세 (전체 엔드포인트)
- [ ] README + 30분 통합 가이드
- [ ] 보안 감사 리포트 (Grok adversarial 결과)
- [ ] 14주 진행 일지 (Phase별 회고)

### 인프라
- [ ] AWS ECS Fargate Terraform 모듈
- [ ] Postgres 16 RLS 활성화
- [ ] Redis 7 BullMQ 큐
- [ ] S3 Object Lock 버킷 (COMPLIANCE 7년)
- [ ] CI/CD GitHub Actions (3-게이트 자동화)

### 특허 매핑 검증
- [ ] S-1~S-9 코드 구현 매핑 (Seyer 핵심)
- [ ] PG-1~PG-7 코드 구현 매핑 (ProofGate 핵심)
- [ ] C-1, C-2 코드 구현 매핑 (ComplyGate·DMS)
- [ ] TB-P1~P5 코드 구현 매핑 (Turing Boundary)

---

## 7. 위험 등록부 (Top 5)

| # | 위험 | 영향 | 완화 |
|---|---|---|---|
| R1 | 클로드 코드가 P1~P10 위반 코드 생성 | HIGH | scan-principles.sh 매 커밋 + DNA Guardian 상시 감시 |
| R2 | Mountain급 컨텍스트 누출 | CRITICAL | Security Wall 차단 훅 + 키워드 스캐너 + 매 세션 검증 |
| R3 | Phase 간 회귀 (선행 Phase 깨짐) | HIGH | E2E 회귀 테스트 + Phase 게이트 강제 |
| R4 | 14주 일정 초과 | MED | Phase 7 Buffer 2주 + Phase별 부분 출시 가능 |
| R5 | 외부 의존 (AWS·GCP·Azure KMS) 장애 | MED | L0 2-of-3 합의 + 로컬 stub 폴백 |

---

## 8. 다음 단계

이 마스터 플랜 확인 후 즉시:
1. `01-CLAUDE.md` 읽기 (프로젝트 헌법)
2. `02-AGENTS.md` 읽기 (8-agent 활성화)
3. `03-PROMPTS.md`의 **Phase 0 프롬프트** 실행
4. Phase 0 게이트 통과 후 Phase 1 진입

**원칙: 한 번에 한 Phase. 게이트 통과 없이 다음 Phase 진입 절대 금지.**

---

*Master Plan v1.0 · 2026.05.21 · DiveLab Internal*
