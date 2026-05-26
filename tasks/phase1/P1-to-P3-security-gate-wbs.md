# P1~P3 보안 게이트 상세 WBS + 타당성 검증표

**목적:** Phase 3까지 필요한 보안 게이트를 실제 구현 가능한 최소 작업 단위로 쪼개고, 각 단위가 타당하게 설계됐는지 검증한다.
**상위 계획:** `tasks/phase1/P1-to-P3-security-gate-masterplan.md`
**현재 결론:** Phase 3 구현 바로 착수는 NO-GO. P1.2-sub2와 Phase 1 chain을 먼저 닫는다.

---

## 0. 타당성 판정 기준

각 작업은 아래 8개 기준을 통과해야 한다. 하나라도 `NO`면 구현 전에 workorder를 보정한다.

| 기준 | 질문 | NO이면 |
|---|---|---|
| Dependency | 선행 작업 없이 구현 가능한가? | 순서 재배치 |
| Scope | 파일/모듈 책임이 좁고 명확한가? | 작업 분할 |
| Testability | 실패/성공/장애 테스트를 쓸 수 있는가? | 테스트 설계 먼저 |
| P1~P10 | 헌법 원칙과 충돌하지 않는가? | 설계 수정 |
| Fail-Closed | 예외/외부 장애 시 deny 방향인가? | 차단 로직 먼저 |
| Evidence | 로그/증거/prevHash/검증 근거가 남는가? | 기록 contract 추가 |
| HumanGate | 사람 승인 지점이 필요한가, 명시됐는가? | 승인 게이트 추가 |
| Memory/DoS | 입력 크기·깊이·동시성·시간 상한이 있는가? | cap과 heavy test 추가 |

판정 라벨:
- `GO`: 바로 구현 가능한 수준.
- `CONDITIONAL GO`: 조건을 먼저 보정하면 구현 가능.
- `NO-GO`: 선행 작업이 없으면 구현하면 안 됨.

---

## 1. 전역 P0 차단 항목

| ID | 차단 항목 | 판정 | 해소 조건 |
|---|---|---|---|
| GB-01 | P1.2-sub2 잔존 3건 | NO-GO | EML 비결정성, JSON size cap, 영향 맵 보정 |
| GB-02 | coverage 80% 문서 기준이 CI에 미강제 | CONDITIONAL GO | coverage script/CI gate 또는 명시 waiver |
| GB-03 | fast gate / heavy gate 미분리 | CONDITIONAL GO | PR fast, nightly heavy 기준 분리 |
| GB-04 | `docs/openapi.yaml` 부재 | CONDITIONAL GO | Phase 1 skeleton 또는 Phase 2 전 생성 |
| GB-05 | `packages/types/src/index.ts` 공백 | CONDITIONAL GO | shared DTO/type export 최소 골격 |
| GB-06 | Phase 2/3 schema 부재 | NO-GO for P2/P3 | schema/type plan 선행 |
| GB-07 | Security Warden 장기 실행 미완료 | CONDITIONAL GO | 다음 보안 인접 구현 전 좁은 범위 재검토 |
| GB-08 | scan GREEN 과신 위험 | CONDITIONAL GO | behavior/e2e evidence를 각 P원칙에 연결 |

---

## 2. Batch A — P1.2-sub2 OraclePrevention 보정

목표: P8 OraclePrevention의 header/time/size/form leak 가능성을 줄이고, P1.2-sub2 workorder를 구현 가능한 상태로 만든다.

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| A-00 | workorder 보정 | GO | 없음 | `tasks/phase1/P1.2-sub2-essential-workorder.md` | 작업지시 결함 8종 0건 |
| A-01 | 영향 맵 5축 재작성 | GO | A-00 | workorder | git/call/rules/docs/tests 모두 명시 |
| A-02 | EML nonce/request input 설계 | CONDITIONAL GO | A-00 | `eml.util.ts`, `types.ts` | 같은 finding 100회 다양성 |
| A-03 | 정상/거부 EML 형식 통일 | CONDITIONAL GO | A-02 | `oracle-prevention.service.ts` | 32 hex, 외부 구별 불가 |
| A-04 | pre-existing header clear | GO | A-01 | `oracle-prevention.service.ts` | leak header 부재 e2e |
| A-05 | request clock 기준 통합 | GO | A-01 | `request-clock.middleware.ts`, `app.module.ts` | 모든 경로 동일 시작 시각 |
| A-06 | 4096 byte max envelope cap | CONDITIONAL GO | A-01 | `size-padding.util.ts` | JSON parse 유지, size bucket 제한 |
| A-07 | payload truncation metadata 위치 확정 | CONDITIONAL GO | A-06 | `types.ts`, `service.ts` | 외부 leak 없는 `_meta` 또는 내부 log |
| A-08 | exception original status 내부 기록 | GO | A-05 | `uniform-error.filter.ts` | 외부 403, 내부 console/audit contract |
| A-09 | middleware rejection 경로 통일 | GO | A-05 | `token-norm.middleware.ts` | TokenNorm deny도 uniform |
| A-10 | regression-first tests | GO | A-02~A-09 | `*.test.ts`, `test/e2e/*.test.ts` | 수정 전 실패 또는 명시 사유 |
| A-11 | heavy timing test 분류 | CONDITIONAL GO | A-05 | e2e 또는 heavy spec | flake 기준/timeout 명시 |
| A-12 | 다중 검토 재실행 | GO | A-10 | review outputs | Codex-Reviewer/Gemini/RedTeam |
| A-13 | HumanGate 승인 | GO | A-12 | 승인 메모 | GO/CONDITIONAL/NO-GO |

**타당성 확인**
- 순서 타당함: workorder와 영향 맵이 먼저라 파일 범위 충돌을 줄인다.
- 테스트 가능함: header/size/EML/time 모두 외부 관찰값으로 검증 가능하다.
- 잔여 위험: timing 통계는 환경 노이즈가 크므로 fast gate가 아니라 heavy gate로 분리해야 한다.

---

## 3. Batch A-1 — Test/Schema Gate Foundation

목표: Phase 2/3로 넘어가기 전에 검증 기반을 먼저 만든다. 기능 구현이 아니라 “계속 안전하게 만들 수 있는 바닥”이다.

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| A1-01 | coverage 기준 결정 | GO | 없음 | `package.json`, CI | coverage 명령 존재 |
| A1-02 | coverage threshold 적용 | CONDITIONAL GO | A1-01 | vitest config 또는 package script | 80% 또는 risk-based waiver |
| A1-03 | fast gate 정의 | GO | A1-01 | `.github/workflows/ci.yml` | PR에서 5~10분 목표 |
| A1-04 | heavy/nightly gate 정의 | CONDITIONAL GO | A1-03 | CI workflow | memory/DoS/concurrency 분리 |
| A1-05 | fixture 디렉토리 생성 기준 | GO | 없음 | `packages/api/test/fixtures/` | fixture schema README |
| A1-06 | OpenAPI skeleton 기준 | CONDITIONAL GO | 없음 | `docs/openapi.yaml` | OpenAPI validator 계획 |
| A1-07 | shared DTO 최소 export 기준 | CONDITIONAL GO | 없음 | `packages/types/src/index.ts` | API DTO import 가능 |
| A1-08 | route ↔ OpenAPI ↔ DTO drift gate 설계 | CONDITIONAL GO | A1-06,A1-07 | script/test | route 생긴 뒤 활성화 |
| A1-09 | DB runtime role 검증 계획 | CONDITIONAL GO | prisma env | scripts/test | owner/runtime 분리 확인 |
| A1-10 | P원칙 behavior evidence matrix | GO | 없음 | docs/task matrix | P5/P8/P9/P10 문자열 아닌 행동 검증 |

**타당성 확인**
- 이 Batch는 Phase 2/3의 선행조건이므로 지금 쪼개는 것이 타당하다.
- 단, OpenAPI skeleton은 실제 route가 적어 초기에는 빈 계약에 가깝다. 그래서 `skeleton + drift gate 설계`까지만 먼저 두고, route 추가 때마다 채운다.

---

## 4. Batch B — Phase 1 W2 MetaLayer Rules

목표: AllowList, GTED, SemanticFirewall, MirrorModel을 rule-only gate로 만든다.

### B1. AllowList + Policy Loader

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| B1-01 | Policy DTO/type 정의 | CONDITIONAL GO | A1-07 | `packages/types` | strict type |
| B1-02 | signed policy shape 확정 | CONDITIONAL GO | B1-01 | types/docs | signer/key/version/hash |
| B1-03 | allow/deny evaluator | GO | B1-01 | `meta-layer/allow-list` | no rule -> deny |
| B1-04 | stale policy deny | GO | B1-02 | service test | expired/version mismatch deny |
| B1-05 | Redis cache adapter interface | CONDITIONAL GO | B1-03 | adapter | Redis 장애 deny |
| B1-06 | local in-memory test adapter | GO | B1-05 | test helper | deterministic tests |
| B1-07 | policy provenance logging contract | CONDITIONAL GO | P1-G6 | audit contract | prevHash required |
| B1-08 | e2e integration with TokenNorm/Oracle | GO | B1-03 | e2e | uniform deny |

**타당성 확인:** GO 가능하지만 Redis 실통합은 heavy gate로 분리한다. 기본 evaluator는 먼저 순수 함수로 만들어야 테스트성이 좋다.

### B2. GTED Distance Gate

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| B2-01 | GTED input normalization contract | GO | TokenNorm | `gted/types.ts` | normalized input only |
| B2-02 | deterministic threshold 정의 | CONDITIONAL GO | B2-01 | workorder/docs | 사람 승인 필요 |
| B2-03 | distance calculator pure function | GO | B2-02 | `gted/*.ts` | golden vectors |
| B2-04 | max length/depth guard | GO | B2-03 | util/test | timeout 없음 |
| B2-05 | expansion ratio guard | GO | B2-03 | test | token explosion deny |
| B2-06 | performance boundary test | CONDITIONAL GO | B2-04 | heavy test | p95 기준 |
| B2-07 | signal-only output | GO | B2-03 | type/test | no final decision boolean |

**타당성 확인:** threshold는 제품 정책이라 사람이 승인해야 한다. AI가 임계값을 임의로 최종 결정하면 P1 취지와 충돌한다.

### B3. SemanticFirewall

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| B3-01 | rule catalog schema | CONDITIONAL GO | A1-07 | `semantic-firewall/types.ts` | rule id/source/severity |
| B3-02 | rule matcher pure engine | GO | B3-01 | service | deterministic match |
| B3-03 | encoding bypass fixtures | GO | B3-02 | fixtures | base64/url/unicode vectors |
| B3-04 | false-positive exception policy | CONDITIONAL GO | B3-02 | docs/types | 사람 승인 |
| B3-05 | OWASP LLM fixture mapping | GO | B3-02 | fixtures | 8/10 target 또는 명시 waiver |
| B3-06 | uniform deny path | GO | Oracle | e2e | status/header/body/time |
| B3-07 | no external model/import scan | GO | scan | scan-principles | P1 pass |

**타당성 확인:** 룰 기반이라 P1에 맞다. 단 exception policy는 우회 통로가 될 수 있어 별도 승인 게이트가 필요하다.

### B4. MirrorModel

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| B4-01 | mirror representation type | CONDITIONAL GO | A1-07 | types | signal-only |
| B4-02 | no-judgment adapter contract | GO | B4-01 | service | no approve/deny final |
| B4-03 | divergence signal scoring | CONDITIONAL GO | B4-02 | service | score is signal, not decision |
| B4-04 | provenance of compared fields | GO | B4-02 | tests | source map exists |
| B4-05 | integration with SemanticFirewall | GO | B3 | tests | flags combine safely |

**타당성 확인:** 이름상 모델처럼 보이지만 실제 구현은 deterministic mirror/diff여야 한다. 외부 AI/ML import는 금지한다.

---

## 5. Batch C — Phase 1 W3 SIREN + MetaLayerGuard

목표: deception/honeypot이 실제 실행 권한이나 내부 상태를 만들지 않도록 격리하고, MetaLayer chain을 완성한다.

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| C-01 | SIREN signal DTO | CONDITIONAL GO | A1-07 | types | risk/confidence/flags only |
| C-02 | Polyintent deterministic analyzer | CONDITIONAL GO | B3/B4 | service | no ML import |
| C-03 | DeceptionGate no-side-effect contract | CONDITIONAL GO | C-01 | service/docs | no DB write/external call |
| C-04 | decoy response uniform path | GO | Oracle | e2e | P8 envelope |
| C-05 | honeypot route registry | CONDITIONAL GO | C-03 | module | isolated route namespace |
| C-06 | honeypot access audit contract | CONDITIONAL GO | P1-G6 | audit helper | prevHash required |
| C-07 | honeypot side-effect test | GO | C-05 | e2e/mock | writes/external calls 0 |
| C-08 | MetaLayerGuard chain order | GO | B/C modules | guard/e2e | TokenNorm -> AllowList -> GTED -> Firewall -> SIREN |
| C-09 | fail-closed matrix | GO | C-08 | e2e | every thrown error denies |
| C-10 | Phase 1 completion review | GO | C-09 | review output | Codex/Gemini/RedTeam/Mythos |

**타당성 확인:** C는 Phase 1의 핵심 변곡점이다. Mythos와 RedTeam은 필수다. 허니팟/decoy가 실제 권한처럼 보이면 법적·운영 리스크가 커지므로 no-side-effect 증명이 완료 조건이다.

---

## 6. Batch D — Phase 2 Turing Boundary

목표: provenance, velocity, session budget, shadow isolation, HumanGate 채널 분리를 만든다.

### D0. Phase 2 Schema/Type/OpenAPI Foundation

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| D0-01 | provenance data model 설계 | NO-GO until A1 | prisma/types | schema review |
| D0-02 | session budget snapshot model | CONDITIONAL GO | D0-01 | prisma/types | Redis/DB consistency doc |
| D0-03 | HumanGate request/evidence model | CONDITIONAL GO | D0-01 | prisma/types | channel separation |
| D0-04 | OpenAPI route skeleton | CONDITIONAL GO | A1-06 | openapi | validator |
| D0-05 | migration drift gate | CONDITIONAL GO | DB env | script | migrate status |

**타당성 확인:** Phase 2는 schema 없이 구현하면 JSON payload 난립이 된다. D0가 먼저다.

### D1~D5 기능 게이트

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| D1-01 | CognitiveFingerprint feature selection | CONDITIONAL GO | D0 | service/docs | privacy review |
| D1-02 | fingerprint collision test | GO | D1-01 | test/fixtures | collision threshold |
| D1-03 | baseline update candidate only | GO | D1-01 | service | no auto final decision |
| D2-01 | ProvenanceChain genesis constant | GO | D0 | service | fixed genesis |
| D2-02 | prevHash continuity verify | GO | D2-01 | service/test | break detected |
| D2-03 | chain break fail-closed hook | CONDITIONAL GO | D2-02 | service | deny/consensus hook |
| D3-01 | VelocityThrottle windows | GO | D0 | service | fake timer |
| D3-02 | Redis atomic budget script/adapter | CONDITIONAL GO | D3-01 | adapter | concurrent 100 |
| D3-03 | Redis failure deny | GO | D3-02 | test | no allow fallback |
| D4-01 | ShadowMode isolation boundary | CONDITIONAL GO | D0 | module | no real DB write |
| D4-02 | external call outbox block | GO | D4-01 | test/mock | calls 0 |
| D4-03 | shadow audit contract | CONDITIONAL GO | P1-G6 | audit | record exists |
| D5-01 | HumanGate not toolCall scan | GO | D0 | scan/test | registry excludes |
| D5-02 | separate config/key namespace | CONDITIONAL GO | env policy | config | no shared key |
| D5-03 | PeerVerify quorum logic | CONDITIONAL GO | D5-02 | service | 2 distinct approvers |
| D5-04 | timeout/failure deny | GO | D5-03 | test | fail-closed |
| D5-05 | approval fatigue signal | CONDITIONAL GO | D5-03 | service | signal only |
| D6-01 | Phase 2 completion review | GO | D1~D5 | review | all axes pass |

**타당성 확인:** Phase 2는 Phase 3의 전제다. HumanGate와 provenance 없이 ConsensusGate를 먼저 만들면 승인/책임/증빙 단위가 비게 된다.

---

## 7. Batch E — Phase 3 Trust Cube Core

목표: L0/L1/L2/Consensus를 단일 provider, 단일 signer, 단일 engine으로 허용하지 않는 구조로 만든다.

### E0. Phase 3 Schema/Type/OpenAPI Foundation

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| E0-01 | MultiRoot provider result DTO | NO-GO until D | types | quorum record |
| E0-02 | DualSign evidence DTO | CONDITIONAL GO | E0-01 | types | distinct signer |
| E0-03 | DMS dry-run state model | CONDITIONAL GO | E0-02 | prisma/types | no real trigger |
| E0-04 | Consensus vote DTO | CONDITIONAL GO | E0-01 | types | engine result |
| E0-05 | TrustMetabolism event DTO | CONDITIONAL GO | D provenance | types | baseline update |

### E1. L0 MultiRoot

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| E1-01 | provider adapter interface | GO after E0 | `trust-cube/l0` | contract tests |
| E1-02 | local stub providers | GO | E1-01 | test adapter | deterministic |
| E1-03 | 2-of-3 quorum evaluator | GO | E1-02 | service | matrix |
| E1-04 | provider timeout deny | GO | E1-03 | test | fail-closed |
| E1-05 | identity binding check | CONDITIONAL GO | E1-03 | service | issuer/SAN mismatch deny |

### E2. L1 ComplyGate

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| E2-01 | canonical payload serializer | GO after E0 | utils/service | stable hash vectors |
| E2-02 | HMAC verification | GO | E2-01 | service | tamper/stale/wrong key deny |
| E2-03 | DualSign quorum | CONDITIONAL GO | E2-02 | service | 2 distinct signers |
| E2-04 | replay prevention | GO | E2-02 | service | nonce/timestamp reuse deny |
| E2-05 | FPV local stub contract | CONDITIONAL GO | E2-03 | service | malformed proof deny |
| E2-06 | no single-signer allow | GO | E2-03 | test | deny |

### E3. DMS + IncidentGovernor

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| E3-01 | DMS dry-run only first | GO | E2 | service | no real external trigger |
| E3-02 | trigger condition matrix | CONDITIONAL GO | E3-01 | docs/test | 사람 승인 |
| E3-03 | DmsTriggerLog WORM append contract | CONDITIONAL GO | P1-G6/D0 | audit | prevHash required |
| E3-04 | IncidentGovernor 4-stage degrade | CONDITIONAL GO | E3-02 | service | deterministic stages |
| E3-05 | external auditor notification stub | CONDITIONAL GO | E3-01 | interface | no secret hardcode |

### E4. L2 Seyer + TrustMetabolism

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| E4-01 | Gate Chain step interface | GO | E0 | `trust-cube/l2` | step contract |
| E4-02 | 10-step order lock | CONDITIONAL GO | E4-01 | service/test | order snapshot |
| E4-03 | step fail stops chain | GO | E4-02 | test | no later step call |
| E4-04 | ImmutableBaseline versioning | CONDITIONAL GO | D/E0 schema | service | no mutation |
| E4-05 | TrustMetabolism curve function | GO | E4-04 | service | 4%/h -> 1%/h bounds |
| E4-06 | 5-min cron adapter | CONDITIONAL GO | E4-05 | module | fake timer |
| E4-07 | activity baseline update | CONDITIONAL GO | E4-05 | service | explicit event |

### E5. ConsensusGate

| Task | 내용 | 판정 | 선행 | 예상 파일 | 검증 |
|---|---|---|---|---|---|
| E5-01 | engine interface | GO | E0 | `consensus` | contract |
| E5-02 | 3 engine evaluator | GO | E5-01 | service | all combinations |
| E5-03 | 2-of-3 required | GO | E5-02 | test | 1 pass deny, 2 pass allow signal |
| E5-04 | 1 engine throw/timeout fail-closed | GO | E5-02 | test | deny |
| E5-05 | uniform response integration | CONDITIONAL GO | Oracle | e2e | P8 matrix |
| E5-06 | no final irresponsible decision wording | GO | E5-03 | scan/test | signals not decision |
| E5-07 | Phase 3 completion review | GO | E1~E5 | review | Codex/Gemini/RedTeam/Mythos |

**타당성 확인:** E는 D 없이는 NO-GO다. Phase 3의 핵심은 “ALLOW를 만든다”가 아니라 “허용 가능 신호를 사람/상위 게이트가 검증할 수 있게 만든다”이다.

---

## 8. Cross-Cutting Workstreams

| Stream | 내용 | 적용 Batch | 판정 |
|---|---|---|---|
| XS-01 | P1~P10 behavior evidence matrix | All | GO |
| XS-02 | Security Wall re-scan after every doc/code batch | All | GO |
| XS-03 | no silent catch / fail-closed review | All | GO |
| XS-04 | memory/DoS heavy fixture suite | A-1 onward | CONDITIONAL GO |
| XS-05 | OpenAPI/DTO drift prevention | A-1 onward | CONDITIONAL GO |
| XS-06 | runtime role / migration drift gate | D/E | CONDITIONAL GO |
| XS-07 | audit/WORM append-only contract | B onward | CONDITIONAL GO |
| XS-08 | HumanGate approval point ledger | D/E | GO |

---

## 9. 작업 크기 판정

| Batch | 크기 | 이유 | 진행 방식 |
|---|---|---|---|
| A | LARGE | OraclePrevention core + e2e 영향 | workorder 승인 후 구현 |
| A-1 | LARGE | CI/test/schema foundation | 별도 workorder |
| B1 | MEDIUM | AllowList 단독 가능 | B1만 구현 가능 |
| B2 | MEDIUM | GTED 독립 pure engine 가능 | B2만 구현 가능 |
| B3 | MEDIUM | Semantic rules 독립 가능 | B3만 구현 가능 |
| B4 | SMALL/MEDIUM | Mirror diff adapter | B3 이후 |
| C | LARGE | SIREN + MetaLayer integration | RedTeam/Mythos 필수 |
| D0 | LARGE | schema/type/OpenAPI | Schema Keeper 필수 |
| D1~D5 | LARGE | Phase 2 전체 | 쪼개서 순차 |
| E0 | LARGE | Phase 3 data contract | D 완료 후 |
| E1~E5 | LARGE | Trust Cube/Consensus | 쪼개서 순차 |

---

## 10. 현재 가장 작은 다음 작업

바로 시작 가능한 최소 작업은 **A-00 ~ A-01**이다.

1. `P1.2-sub2-essential-workorder.md` 보정.
2. 영향 맵 5축을 실제 파일 기준으로 재작성.
3. EML/size/header/request-clock 검증 기준을 모순 없이 정리.
4. Pre-Phase A 다중 검토 재실행.
5. GO일 때만 구현.

이 작업은 코드 수정 전 계획 보정이므로 위험이 낮고, 현재 NO-GO를 GO 후보로 바꾸기 위한 첫 번째 필수 단계다.
