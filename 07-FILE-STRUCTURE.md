# 07-FILE-STRUCTURE.md — 디렉토리·모듈 구조
**Coesite MVP P0 · 최종 파일 트리 + 모듈 책임**

---

## 0. 전체 트리 (Phase 6 완료 시)

```
coesite/
├── packages/
│   ├── types/                          # @coesite/types
│   │   ├── src/
│   │   │   ├── common.ts              # Timestamp, UUID, Hash, TenantId
│   │   │   ├── meta-layer.ts          # Phase 1 타입
│   │   │   ├── turing.ts              # Phase 2 타입
│   │   │   ├── trust-cube.ts          # Phase 3 타입
│   │   │   ├── proof-gate.ts          # Phase 4 타입
│   │   │   ├── red-gate.ts            # Phase 5 타입
│   │   │   ├── consensus.ts           # P10 타입
│   │   │   ├── attestation.ts         # P5 체인 타입
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── utils/                          # @coesite/utils
│   │   ├── src/
│   │   │   ├── hash.ts                # SHA-256, HMAC, HashChain
│   │   │   ├── crypto.ts              # Ed25519, AES-256-GCM
│   │   │   ├── jwt.ts                 # JWT 발급·검증 (RS256)
│   │   │   ├── eml.ts                 # eml(x,y) = exp(x) - ln(y)
│   │   │   ├── gted.ts                # Graph Token Edit Distance
│   │   │   ├── token-norm.ts          # Unicode 정규화 유틸
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api/                            # @coesite/api (메인)
│   │   ├── src/
│   │   │   ├── main.ts                # Bootstrap
│   │   │   ├── app.module.ts          # Root module
│   │   │   │
│   │   │   ├── meta-layer/            # ─── Phase 1 ───
│   │   │   │   ├── meta-layer.module.ts
│   │   │   │   ├── meta-layer.guard.ts        # 통합 Composite Guard
│   │   │   │   ├── token-norm/
│   │   │   │   │   ├── token-norm.service.ts
│   │   │   │   │   ├── token-norm.middleware.ts
│   │   │   │   │   └── token-norm.spec.ts
│   │   │   │   ├── allowlist-gted/
│   │   │   │   │   ├── allowlist.service.ts
│   │   │   │   │   ├── gted.service.ts
│   │   │   │   │   ├── m1.guard.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── semantic-firewall/
│   │   │   │   │   ├── semantic-firewall.service.ts
│   │   │   │   │   ├── mirror-model.service.ts
│   │   │   │   │   ├── rules/         # 카테고리별 룰
│   │   │   │   │   │   ├── system-prompt-leak.rules.ts
│   │   │   │   │   │   ├── role-override.rules.ts
│   │   │   │   │   │   └── jailbreak.rules.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   └── siren/             # SIREN 3.0
│   │   │   │       ├── polyintent.service.ts
│   │   │   │       ├── deception-gate.service.ts
│   │   │   │       ├── honeypot.service.ts
│   │   │   │       ├── game-theory.ts
│   │   │   │       ├── watermark.ts   # 제로폭 + 핑백
│   │   │   │       └── *.spec.ts
│   │   │   │
│   │   │   ├── turing/                # ─── Phase 2 ───
│   │   │   │   ├── turing.module.ts
│   │   │   │   ├── tb1-fingerprint/
│   │   │   │   │   ├── cognitive-fingerprint.service.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── tb2-provenance/
│   │   │   │   │   ├── provenance-chain.service.ts
│   │   │   │   │   ├── security-dna.service.ts
│   │   │   │   │   ├── genesis.ts     # genesis 블록 상수
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── tb3-velocity/
│   │   │   │   │   ├── velocity-throttle.service.ts
│   │   │   │   │   ├── session-budget.service.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── tb4-shadow/
│   │   │   │   │   ├── shadow-mode.service.ts
│   │   │   │   │   ├── immune-isolation.guard.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   └── tb5-human-gate/    # P4 채널 분리
│   │   │   │       ├── human-gate.service.ts
│   │   │   │       ├── bio-auth.service.ts
│   │   │   │       ├── peer-verify.service.ts
│   │   │   │       ├── approval-fatigue.service.ts
│   │   │   │       ├── human-gate.controller.ts  # 별도 도메인
│   │   │   │       └── *.spec.ts
│   │   │   │
│   │   │   ├── trust-cube/            # ─── Phase 3 ───
│   │   │   │   ├── trust-cube.module.ts
│   │   │   │   ├── l0-multiroot/
│   │   │   │   │   ├── kms-adapter.interface.ts
│   │   │   │   │   ├── aws-kms.adapter.ts
│   │   │   │   │   ├── gcp-kms.adapter.ts
│   │   │   │   │   ├── azure-kv.adapter.ts
│   │   │   │   │   ├── local-stub.adapter.ts
│   │   │   │   │   ├── multi-root.service.ts  # 2-of-3
│   │   │   │   │   ├── spiffe.adapter.ts
│   │   │   │   │   ├── mcp-gateway.stub.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── l1-comply-gate/
│   │   │   │   │   ├── comply-gate.service.ts
│   │   │   │   │   ├── policy-engine.service.ts
│   │   │   │   │   ├── hmac-verifier.service.ts
│   │   │   │   │   ├── dual-sign.service.ts
│   │   │   │   │   ├── fpv-verifier.service.ts
│   │   │   │   │   ├── dms/           # C-2 Dead Man's Switch
│   │   │   │   │   │   ├── dms.service.ts
│   │   │   │   │   │   ├── dms-trigger.detector.ts
│   │   │   │   │   │   ├── dms-disclosure.service.ts
│   │   │   │   │   │   └── dry-run.service.ts
│   │   │   │   │   ├── incident-governor.service.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   └── l2-seyer/
│   │   │   │       ├── seyer.module.ts
│   │   │   │       ├── gate-chain/    # 10단계
│   │   │   │       │   ├── gate-chain.service.ts
│   │   │   │       │   ├── step03-policy-gate.ts
│   │   │   │       │   ├── step04-sod-gate.ts
│   │   │   │       │   ├── step05-rule-engine.ts
│   │   │   │       │   ├── step06-anomaly-s5.ts
│   │   │   │       │   ├── step07-nk-module-s7.ts
│   │   │   │       │   ├── step08-trust-metabolism.ts
│   │   │   │       │   ├── step09-session-boundary.ts
│   │   │   │       │   └── step10-consensus.ts
│   │   │   │       ├── immutable-baseline.service.ts
│   │   │   │       ├── trust-metabolism.cron.ts
│   │   │   │       └── *.spec.ts
│   │   │   │
│   │   │   ├── consensus/             # P10 강제 (cross-cutting)
│   │   │   │   ├── consensus.module.ts
│   │   │   │   ├── consensus-gate.service.ts  # 3엔진 2-of-3
│   │   │   │   ├── rule-engine.ts
│   │   │   │   ├── anomaly-engine.ts
│   │   │   │   ├── consensus-voter.ts
│   │   │   │   └── *.spec.ts
│   │   │   │
│   │   │   ├── proof-gate/            # ─── Phase 4 ───
│   │   │   │   ├── proof-gate.module.ts
│   │   │   │   ├── preview/
│   │   │   │   │   ├── preview-engine.service.ts
│   │   │   │   │   ├── preview-budget.service.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── contract/
│   │   │   │   │   ├── release-contract.service.ts
│   │   │   │   │   ├── metadata-guard.service.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── bundle/
│   │   │   │   │   ├── proof-bundle.service.ts
│   │   │   │   │   ├── zkbp.service.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── audit/
│   │   │   │   │   ├── out-of-band-log.service.ts
│   │   │   │   │   ├── heartbeat.cron.ts
│   │   │   │   │   ├── approval-fatigue.detector.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   └── *.spec.ts
│   │   │   │
│   │   │   ├── red-gate/              # ─── Phase 5 ───
│   │   │   │   ├── red-gate.module.ts
│   │   │   │   ├── red-gate.service.ts        # 외부 감사
│   │   │   │   ├── red-gate.controller.ts     # read-only API
│   │   │   │   ├── audit-query-dsl.ts
│   │   │   │   ├── auditor-key.service.ts     # HumanGate 승인
│   │   │   │   ├── restore.service.ts
│   │   │   │   └── *.spec.ts
│   │   │   │
│   │   │   ├── worm/                  # P3 강제 (cross-cutting)
│   │   │   │   ├── worm.module.ts
│   │   │   │   ├── worm.service.ts            # 통합 인터페이스
│   │   │   │   ├── postgres-worm.adapter.ts
│   │   │   │   ├── s3-worm.adapter.ts
│   │   │   │   ├── worm-sync.cron.ts          # PG → S3
│   │   │   │   ├── attestation-chain.service.ts  # P5
│   │   │   │   └── *.spec.ts
│   │   │   │
│   │   │   ├── common/                # 횡단 관심사
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── oracle-prevention.interceptor.ts  # P8
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── filters/
│   │   │   │   │   ├── uniform-error.filter.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── tenant-id.guard.ts
│   │   │   │   │   └── *.spec.ts
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── coesite-guard.decorator.ts
│   │   │   │   │   └── secure-endpoint.decorator.ts
│   │   │   │   └── pipes/
│   │   │   │       ├── token-norm.pipe.ts
│   │   │   │       └── *.spec.ts
│   │   │   │
│   │   │   └── infrastructure/
│   │   │       ├── prisma.service.ts
│   │   │       ├── redis.service.ts
│   │   │       └── bullmq.service.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 8개 테이블
│   │   │   └── migrations/
│   │   │       ├── 001_init/
│   │   │       │   └── migration.sql
│   │   │       ├── 002_worm_triggers/
│   │   │       │   └── migration.sql  # WORM BEFORE 트리거
│   │   │       └── ...
│   │   │
│   │   ├── test/
│   │   │   ├── e2e/                   # Phase 6
│   │   │   │   ├── scenario-01-normal.spec.ts
│   │   │   │   ├── scenario-02-attack.spec.ts
│   │   │   │   ├── scenario-03-incident.spec.ts
│   │   │   │   ├── scenario-04-collusion.spec.ts
│   │   │   │   └── scenario-05-recovery.spec.ts
│   │   │   ├── grok-adversarial/
│   │   │   │   └── 11-attacks.spec.ts
│   │   │   └── debug/                 # AUTO-DEBUG 격리
│   │   │
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── Dockerfile
│   │
│   └── sdk/                            # @divelab/coesite-guards
│       ├── src/
│       │   ├── client/
│       │   │   ├── coesite-client.ts
│       │   │   ├── config.ts
│       │   │   ├── http-client.ts
│       │   │   └── wal-buffer.ts
│       │   ├── decorators/
│       │   │   ├── coesite-guard.decorator.ts
│       │   │   └── presets.ts         # @public/@standard/@sensitive
│       │   ├── modes/
│       │   │   ├── local-mode.ts
│       │   │   └── remote-mode.ts
│       │   ├── types/                 # @coesite/types 재export
│       │   └── index.ts
│       ├── test/
│       ├── package.json
│       ├── README.md                  # 30분 통합 가이드
│       └── tsconfig.json
│
├── infra/
│   ├── terraform/                      # ─── Phase 5 ───
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── modules/
│   │   │   ├── ecs-fargate/
│   │   │   ├── rds-postgres/
│   │   │   ├── elasticache-redis/
│   │   │   ├── s3-object-lock/        # COMPLIANCE 7년
│   │   │   ├── kms-multi-region/
│   │   │   ├── cloudfront-cdn/
│   │   │   └── waf-shield/
│   │   ├── environments/
│   │   │   ├── dev/
│   │   │   ├── staging/
│   │   │   └── prod/
│   │   └── README.md
│   │
│   └── docker-compose.yml              # 로컬 (Postgres + Redis)
│
├── scripts/
│   ├── scan-principles.sh              # P1~P10 자동 검증
│   ├── security-wall.sh                # Mountain 키워드 차단
│   ├── phase-gate.sh                   # Phase 게이트 자동화
│   ├── auto-debug.sh                   # AUTO-DEBUG 7-step 보조
│   ├── worm-verify.sh                  # WORM 무결성 검증
│   └── grok-harness.sh                 # adversarial 11종 실행
│
├── docs/
│   ├── 00-MASTER-PLAN.md
│   ├── 01-CLAUDE.md
│   ├── 02-AGENTS.md
│   ├── 03-PROMPTS.md
│   ├── 04-SECURITY-WALL.md
│   ├── 05-SCAN-PRINCIPLES.sh           # 참조용 사본
│   ├── 06-VERIFICATION.md
│   ├── 07-FILE-STRUCTURE.md            # 이 파일
│   ├── openapi.yaml                    # API 명세 (Phase 6)
│   ├── architecture/
│   │   ├── meta-layer.md
│   │   ├── turing-boundary.md
│   │   ├── trust-cube.md
│   │   ├── proof-gate.md
│   │   └── red-gate.md
│   └── SECURITY-AUDIT-REPORT.md        # Phase 7
│
├── tasks/
│   ├── phase0/
│   │   ├── RETROSPECTIVE.md
│   │   └── tasks.md
│   ├── phase1/
│   ├── ...
│   ├── post-mortem/                    # AUTO-DEBUG 기록
│   ├── security-incidents/             # Security Wall 위반 기록
│   ├── daily-log.md
│   └── current-task.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                      # 4-게이트
│       ├── e2e.yml                     # Phase 6 E2E
│       └── security-audit.yml          # Phase 7
│
├── .claude/
│   └── agents/                         # 8-agent sub-agent 파일
│       ├── dna-guardian.md
│       ├── gate-enforcer.md
│       ├── schema-keeper.md
│       ├── source-auditor.md
│       ├── journey-guardian.md
│       ├── security-warden.md
│       ├── ai-engine-router.md
│       └── test-sentinel.md
│
├── .husky/
│   ├── pre-commit                      # scan + security-wall
│   └── commit-msg
│
├── CLAUDE.md                           # 루트 = docs/01-CLAUDE.md 사본
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .gitignore
├── .editorconfig
├── .nvmrc
├── .env.example
├── README.md
└── LICENSE                             # BSL
```

---

## 1. 패키지 의존성 그래프

```
                    @coesite/types
                          ▲
                          │
              ┌───────────┴───────────┐
              │                       │
        @coesite/utils         @coesite/api
              ▲                       ▲
              │                       │
              └───────────┬───────────┘
                          │
                  @divelab/coesite-guards (SDK)
```

**단방향 강제**:
- types ← utils (utils가 types 사용)
- types, utils ← api (api가 둘 다 사용)
- types, utils, api ← sdk (sdk가 셋 다 사용)
- 역방향 import 절대 금지 (P6 결합의존 + P7 환각 금지)

---

## 2. 모듈 의존성 (api 내부)

```
[META-LAYER]
  TokenNorm → AllowList+GTED → SemanticFirewall+MirrorModel → SIREN
        ↓
[TURING BOUNDARY]
  TB-1 Fingerprint → TB-2 Provenance → TB-3 Velocity → TB-4 Shadow → TB-5 HumanGate
        ↓                                                                    ↑
        │                                                          (P4 분리: 별도 채널)
        ▼
[TRUST CUBE]
  L0 MultiRoot → L1 ComplyGate → L2 Seyer → ConsensusGate → L3 ProofGate
                      ↓ DMS                      ↑ P10
                      ↓                          │
                   IncidentGovernor              │
                                                 │
[WORM 횡단]                                       │
  AttestationChain ←── 모든 Gate가 기록 ────────┤
  Postgres WORM Trigger                          │
  S3 Object Lock                                 │
                                                 │
[RedGate 외부]                                    │
  Read-only API ← 감사관 (HumanGate 승인 후) ───┘
```

---

## 3. 핵심 파일 책임 매트릭스

### Cross-cutting (모든 Phase 영향)

| 파일 | 책임 | 원칙 |
|---|---|---|
| `common/interceptors/oracle-prevention.interceptor.ts` | P8 응답 균일화 | P8 |
| `common/filters/uniform-error.filter.ts` | P8 균일 에러 | P8 |
| `worm/worm.service.ts` | P3 WORM 통합 | P3 |
| `worm/attestation-chain.service.ts` | P5 체인 | P5 |
| `consensus/consensus-gate.service.ts` | P10 합의 | P10 |
| `tb5-human-gate/human-gate.controller.ts` | P4 채널 분리 | P4 |

### Phase 1 핵심

| 파일 | 라인 수 (예상) | 핵심 책임 |
|---|---:|---|
| `token-norm.service.ts` | ~150 | Unicode 정규화·이중 인코딩 탐지 |
| `gted.service.ts` | ~200 | Graph edit distance 계산 |
| `semantic-firewall.service.ts` | ~250 | 룰 기반 의미 분석 |
| `polyintent.service.ts` | ~200 | 의도 분산도 측정 |
| `deception-gate.service.ts` | ~250 | 디코이 응답 + 워터마크 |
| `honeypot.service.ts` | ~200 | 전경로 허니팟 |
| `meta-layer.guard.ts` | ~150 | 4단계 통합 |

### Phase 2 핵심

| 파일 | 라인 수 (예상) | 핵심 책임 |
|---|---:|---|
| `cognitive-fingerprint.service.ts` | ~180 | 행동 지문 |
| `provenance-chain.service.ts` | ~200 | prevHash 체인 |
| `velocity-throttle.service.ts` | ~150 | 다중 윈도우 |
| `session-budget.service.ts` | ~120 | Redis atomic 카운터 |
| `shadow-mode.service.ts` | ~180 | 격리 환경 |
| `human-gate.service.ts` | ~250 | 승인 큐 + BioAuth |
| `peer-verify.service.ts` | ~120 | 2명 동시 승인 |

### Phase 3 핵심

| 파일 | 라인 수 (예상) | 핵심 책임 |
|---|---:|---|
| `multi-root.service.ts` | ~200 | 2-of-3 합의 |
| `comply-gate.service.ts` | ~250 | 정책 평가 |
| `dms.service.ts` | ~300 | Dead Man's Switch |
| `gate-chain.service.ts` | ~400 | 10단계 체인 |
| `trust-metabolism.cron.ts` | ~150 | sigmoid 감쇠 |
| `consensus-gate.service.ts` | ~250 | 3엔진 2-of-3 |

### Phase 4 핵심

| 파일 | 라인 수 (예상) | 핵심 책임 |
|---|---:|---|
| `preview-engine.service.ts` | ~250 | preview-first |
| `release-contract.service.ts` | ~200 | 공개 계약 |
| `preview-budget.service.ts` | ~180 | 누적 면적 |
| `proof-bundle.service.ts` | ~250 | 증거 번들 |
| `zkbp.service.ts` | ~200 | ZK 증명 |
| `heartbeat.cron.ts` | ~80 | DMS 연동 |

### Phase 5 핵심

| 파일 | 라인 수 (예상) | 핵심 책임 |
|---|---:|---|
| `postgres-worm.adapter.ts` | ~150 | Postgres 트리거 |
| `s3-worm.adapter.ts` | ~200 | S3 Object Lock |
| `worm-sync.cron.ts` | ~150 | PG → S3 동기화 |
| `red-gate.controller.ts` | ~200 | 외부 read-only API |
| `auditor-key.service.ts` | ~150 | 감사 키 발급 |

### Phase 6 핵심

| 파일 | 라인 수 (예상) | 핵심 책임 |
|---|---:|---|
| `coesite-client.ts` (SDK) | ~300 | 클라이언트 메인 |
| `presets.ts` (SDK) | ~150 | 3 프리셋 |
| `e2e/*.spec.ts` × 5 | ~500 (총) | E2E 시나리오 |
| `grok-adversarial/11-attacks.spec.ts` | ~400 | 11종 공격 |
| `openapi.yaml` | ~1000 | API 명세 |
| `README.md` (SDK) | ~500 | 30분 가이드 |

---

## 4. 예상 총 코드 규모

```
Phase 0: ~500 LOC (인프라·설정)
Phase 1: ~1,400 LOC + 500 테스트
Phase 2: ~1,200 LOC + 500 테스트
Phase 3: ~1,800 LOC + 700 테스트
Phase 4: ~1,300 LOC + 500 테스트
Phase 5: ~800 LOC + 400 테스트
Phase 6: ~1,500 LOC + 1,200 테스트 (E2E 포함)
───────────────────────────────────────
총: ~8,500 LOC + ~4,300 테스트 LOC
```

비교 기준:
- Seyer v1.0 (이전 작업): 30+ 파일, 150+ 테스트
- 평균 NestJS 백엔드 (중소): 5,000~15,000 LOC
- Coesite는 비교적 작지만 밀도가 매우 높음

---

## 5. 환경 변수 (.env.example)

```bash
# ── App ─────────────────────────────────
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# ── Database ────────────────────────────
DATABASE_URL=<local-postgres-url>

# ── Redis ───────────────────────────────
REDIS_URL=redis://localhost:6379

# ── JWT ─────────────────────────────────
JWT_SECRET=  # dev only, prod uses KMS
JWT_PUBLIC_KEY_PATH=./keys/jwt-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-private.pem

# ── KMS (L0 MultiRoot) ──────────────────
AWS_REGION=ap-northeast-2
AWS_KMS_KEY_ID=
GCP_KMS_PROJECT=
GCP_KMS_LOCATION=asia-northeast3
GCP_KMS_KEYRING=coesite
GCP_KMS_KEY=signing
AZURE_KV_VAULT_URL=
AZURE_KV_KEY_NAME=

# ── S3 Object Lock (WORM) ───────────────
S3_WORM_BUCKET=coesite-worm-prod
S3_WORM_REGION=ap-northeast-2
S3_RETENTION_YEARS=7

# ── HumanGate (P4 분리) ─────────────────
HUMANGATE_API_URL=https://humangate.coesite.io
HUMANGATE_KMS_KEY=    # 별도 키링
HUMANGATE_BIOAUTH_PROVIDER=fido2
SMS_PROVIDER_KEY=
EMAIL_PROVIDER_KEY=
PUSH_PROVIDER_KEY=

# ── DMS ─────────────────────────────────
DMS_HMAC_SECRET=
DMS_REGULATOR_WEBHOOK_URL=
DMS_AUDITOR_WEBHOOK_URL=
DMS_DRY_RUN=false  # prod=false

# ── Oracle Prevention ───────────────────
ORACLE_MIN_RESPONSE_MS=200
ORACLE_SIZE_PADDING_BYTES=512

# ── Consensus ───────────────────────────
CONSENSUS_QUORUM=2  # 2-of-3
CONSENSUS_TIMEOUT_MS=1000

# ── Trust Metabolism ────────────────────
TRUST_METABOLISM_CRON="*/5 * * * *"
TRUST_DECAY_HIGH=0.04   # 4%/h
TRUST_DECAY_LOW=0.01    # 1%/h

# ── External (Phase 6) ──────────────────
GROK_HARNESS_URL=  # adversarial 시뮬
OPUS_REVIEW_KEY=   # peer review
```

---

## 6. README 골조

```markdown
# Coesite MVP P0

> DiveLab AI Trust Security Protocol — MVP Phase 0
> "TEP defines the threat. Coesite stops it."

## 빠른 시작
1. 의존성 설치: `pnpm install`
2. 로컬 환경: `docker compose up -d`
3. 마이그레이션: `pnpm prisma migrate dev`
4. 개발 서버: `pnpm dev`

## 구조
- 4 packages (types/utils/api/sdk)
- 14주 7-Phase 로드맵 → docs/00-MASTER-PLAN.md

## 검증
```bash
pnpm scan       # P1~P10
pnpm security   # Mountain Wall
pnpm test       # vitest
pnpm gate       # 4-게이트 통합
```

## 라이선스
BSL (Business Source License) — 4년 후 Apache 2.0
```

---

## 7. 변경 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| v1.0 | 2026.05.21 | 초기 작성 |

---

*이 구조는 Phase 6 완료 시 최종 형태다.*
*각 Phase 진행 중 임시 파일 (debug, scratch)은 별도 폴더 사용 후 정리.*
