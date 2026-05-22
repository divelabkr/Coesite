# 03-PROMPTS.md — Phase별 Claude Code 프롬프트
**Coesite MVP P0 · 14주 클로드 코드 실행 지시서**

---

## 0. 사용 방법

각 Phase 시작 시 해당 섹션을 그대로 클로드 코드에 붙여넣는다.
프롬프트 앞에 항상 다음 prefix를 붙인다:

```
[Coesite Session Start]
00-MASTER-PLAN.md, 01-CLAUDE.md, 02-AGENTS.md, 04-SECURITY-WALL.md 읽고
8-agent 활성화 후 아래 Phase {N} 프롬프트 실행.

---
{Phase N 프롬프트 본문}
```

---

# Phase 0 — Foundation (1주)

## P0.1 — Mono-repo 초기화

```
Phase 0 - Task 1: Mono-repo 생성

목표:
4개 패키지로 구성된 Mono-repo 초기화.
- packages/types  (공유 타입)
- packages/utils  (공유 유틸: hash, crypto, jwt)
- packages/api    (NestJS 백엔드)
- packages/sdk    (Phase 6에서 채움 - skel만)

작업:
1. pnpm workspace 초기화 (pnpm-workspace.yaml)
2. 각 패키지 package.json 생성 (이름: @coesite/types, @coesite/utils, @coesite/api, @coesite/sdk)
3. 루트 tsconfig.base.json + 각 패키지 tsconfig.json (extends base)
4. .gitignore, .editorconfig, .nvmrc(22)
5. 루트 package.json scripts: dev, build, test, scan, lint

제약:
- TypeScript 5.4 strict 모드
- Node.js 22
- NestJS 10 (api 패키지만)
- import 별칭: @types/*, @utils/*

검증:
- pnpm install 성공
- pnpm -r build 성공 (skel만 있어도 통과)
- tsc --noEmit 0 오류
- 04-SECURITY-WALL.md의 Mountain 키워드 스캔 0건

산출물 보고: 01-CLAUDE.md 10번 보고 양식 따를 것.
```

## P0.2 — Docker Compose 로컬 환경

```
Phase 0 - Task 2: Docker Compose 로컬 환경

목표:
Postgres 16 + Redis 7 로컬 환경 (개발용).

작업:
1. infra/docker-compose.yml 작성
   - postgres: 16-alpine, 포트 5432, 볼륨 영속화
   - redis: 7-alpine, 포트 6379
   - 각 서비스 healthcheck
2. infra/.env.example (DB 연결 문자열, Redis URL)
3. packages/api/.env.example (위 .env 참조 + JWT 시크릿 placeholder)
4. README 섹션 "로컬 환경 시작" 추가

제약:
- 시크릿 하드코딩 금지 (전부 .env)
- 프로덕션용 Terraform은 Phase 5에서 별도

검증:
- docker compose up -d 성공
- docker compose ps 모두 healthy
- psql 접속 가능
- redis-cli ping → PONG

산출물 보고 필수.
```

## P0.3 — Prisma 스키마 v1

```
Phase 0 - Task 3: Prisma 스키마 v1 (최소 8개 테이블)

목표:
Coesite 핵심 엔티티 정의 + 마이그레이션 생성.

8개 테이블:
1. Agent              (id, name, trustScore, baseline, activeSessions, createdAt)
2. Session            (id, agentId, startedAt, expiresAt, budgetRemaining, status)
3. Policy             (id, name, version, allowList JSONB, signedBy, signedAt)
4. AuditLog ★WORM    (id, agentId, action, hash, prevHash, payload JSONB, createdAt)
5. WormLog ★WORM     (id, source, level, message, hash, prevHash, createdAt)
6. AdminActionLog ★WORM (id, adminId, action, payload JSONB, hash, prevHash, createdAt)
7. DmsTriggerLog ★WORM  (id, triggerType, payload JSONB, hash, prevHash, createdAt)
8. ProofBundle ★WORM    (id, sessionId, contractId, payload JSONB, signature, hash, prevHash, createdAt)

작업:
1. prisma/schema.prisma 작성 (8개 테이블)
2. 모든 WORM 테이블에 @@map + comment "WORM: UPDATE/DELETE 금지"
3. 인덱스 (agentId, createdAt, hash)
4. Postgres 트리거 작성 (별도 .sql 파일):
   - prevent_update_audit_log
   - prevent_delete_audit_log
   - (5개 WORM 테이블 전부)
5. prisma migrate dev → init 마이그레이션 생성
6. 트리거 마이그레이션 별도 (V_002_worm_triggers.sql)

제약:
- P3 WORM 절대 준수
- prevHash NOT NULL (genesis 블록 예외)
- 모든 ID는 cuid()

검증:
- npx prisma generate 성공
- npx prisma migrate dev --name init 성공
- 트리거 적용 후 UPDATE/DELETE 시도 → 에러 발생 (수동 확인)
- tsc --noEmit 0 오류

산출물 보고 + Schema Keeper 핸드오프.
```

## P0.4 — CLAUDE.md·8-agent·scan 등록

```
Phase 0 - Task 4: 프로젝트 헌법·스캔 스크립트 등록

목표:
01-CLAUDE.md를 루트 CLAUDE.md로 복사 + scan-principles.sh 등록 + CI 훅 등록.

작업:
1. 루트 CLAUDE.md = 01-CLAUDE.md 내용 그대로
2. docs/ 폴더에 00~07.md 전체 배치
3. scripts/scan-principles.sh = 05-SCAN-PRINCIPLES.sh 내용 복사 (chmod +x)
4. scripts/security-wall.sh = 04-SECURITY-WALL.md의 스캔 스크립트 추출
5. .github/workflows/ci.yml 작성:
   - on: push, pull_request
   - jobs:
     a. type-check (tsc --noEmit)
     b. unit-test (vitest)
     c. scan-principles (scan-principles.sh)
     d. security-wall (security-wall.sh)
   - 4개 모두 통과해야 머지 가능
6. .claude/agents/ 폴더 8개 .md (DNA Guardian ~ Test Sentinel)
   - 02-AGENTS.md의 각 에이전트 spec을 별도 파일로 분리

제약:
- 모든 스크립트는 bash + set -e
- CI는 main + develop 브랜치 보호 룰 자동 등록 안내

검증:
- bash scripts/scan-principles.sh → 모든 체크 PASS (코드 없어도 통과)
- bash scripts/security-wall.sh → Mountain 키워드 0건
- act (로컬 GitHub Actions) 또는 푸시 후 CI 통과 확인

산출물 보고 + Phase 0 게이트 진입.
```

## P0.5 — Phase 0 게이트

```
Phase 0 - Task 5: Phase 0 게이트 검증

3-게이트 실행:
1. npx tsc --noEmit  →  0 오류
2. npx vitest run    →  skel 테스트 통과 (Hello World 수준)
3. bash scripts/scan-principles.sh  →  P1~P10 0 위반
4. bash scripts/security-wall.sh    →  Mountain 0건

추가 검증:
- docker compose up -d 후 모든 서비스 healthy
- prisma migrate status 최신
- pnpm -r build 성공
- 모든 8-agent .md 파일 존재

통과 시:
- tasks/phase0/RETROSPECTIVE.md 작성 (회고)
- Phase 1 진입 승인 요청

실패 시:
- AUTO-DEBUG 7-step 실행
- 3회 실패 시 HumanGate
```

---

# Phase 1 — META-LAYER 3.0 (3주, SIREN 풀 포함)

## P1.1 — TokenNorm 미들웨어 (W1 D1~3)

```
Phase 1 - Task 1: TokenNorm 미들웨어

배경:
META-LAYER 첫 관문. 모든 incoming 요청의 token을 정규화.
공격자가 인코딩 변형으로 우회하는 것을 차단.

목표:
packages/api/src/meta-layer/token-norm/ 모듈 작성.

작업:
1. TokenNormService:
   - Unicode NFKC 정규화
   - 제로폭 문자 제거 (U+200B, U+200C, U+200D, U+FEFF)
   - 동형이의 문자 정규화 (Cyrillic→Latin 매핑 테이블)
   - Base64 디코딩 시도 (의심 패턴)
   - URL 디코딩 (이중 인코딩 탐지)
2. TokenNormMiddleware (NestJS):
   - 모든 라우트에 적용
   - req.body, req.query, req.headers 정규화
   - 변형 탐지 시 metadata 기록 (P5 AttestationChain 연동)
3. 단위 테스트 20+ 케이스:
   - 정상 케이스
   - 제로폭 문자 삽입
   - Cyrillic 'а' vs Latin 'a'
   - Base64 인코딩된 페이로드
   - 이중 URL 인코딩

제약:
- P1: ML 사용 금지 (룰 기반만)
- P2: 변형 탐지 시 = 거부 (fail-closed)
- P8: 응답 시간 균일화 - 정규화 처리 시간 측정 후 padding

검증:
- vitest 20+ 통과
- tsc 0 오류
- scan 0 위반

산출물 보고.
```

## P1.2 — OraclePrevention 인터셉터 (W1 D4~7)

```
Phase 1 - Task 2: OraclePrevention 인터셉터 (P8 강제)

배경:
P8 Oracle Prevention. 응답 시간·크기·형태 균일화로 역공학 차단.

목표:
packages/api/src/common/oracle-prevention/ 모듈 작성.

작업:
1. OraclePreventionInterceptor (NestJS):
   - 최소 응답 시간 padding (e.g., 200ms)
   - 응답 크기 K-segment 단위 패딩 (e.g., 512 bytes)
   - 거부 응답 = 모두 동일 메시지 + 동일 status code (403)
   - 성공/실패 응답 시간 동일 분포
2. EML Tree (eml(x,y) = exp(x) - ln(y)):
   - 모든 거부 응답에 EML 시그널 첨부
   - x, y는 내부 상태 기반 (외부 노출 X)
3. 통계 테스트:
   - 1000회 요청 시 응답 시간 표준편차 < 5ms
   - 응답 크기 모두 K 배수

제약:
- P1, P2 준수
- P8 핵심 구현체

검증:
- vitest 통계 테스트 통과
- 로컬 부하 테스트 (k6 등) 응답 시간 분산 확인

산출물 보고.
```

## P1.3 — M-1 AllowList + GTED (W2 D1~3)

```
Phase 1 - Task 3: M-1 AllowList + GTED 거리 기반 거부

배경:
META 두 번째 관문. AllowList + GTED(Graph-based Token Edit Distance)로 의심 토큰 거부.

목표:
packages/api/src/meta-layer/allowlist-gted/ 모듈 작성.

작업:
1. AllowListService:
   - Policy 테이블에서 allowList JSONB 로드
   - 캐시 (Redis 5분 TTL)
   - HMAC 서명 검증 (정책 변조 방지)
2. GTEDService:
   - Graph-based edit distance 계산
   - AllowList 항목과의 최소 거리
   - 거리 임계값 초과 시 거부
   - 가까운 변형(typosquatting) 탐지
3. M1Guard (NestJS Guard):
   - TokenNorm 후 적용
   - AllowList 정확 매칭 → 통과
   - GTED 거리 < 임계값 → 의심 (SIREN으로 우회)
   - 그 외 → 거부

제약:
- P1: ML 금지 (그래프 알고리즘만)
- P6: 단독 사용 불가 - SIREN과 결합

검증:
- vitest 30+ 통과
- 정확 매칭·근접 변형·먼 거부 3가지 흐름 테스트

산출물 보고.
```

## P1.4 — SemanticFirewall + MirrorModel (W2 D4~7)

```
Phase 1 - Task 4: SemanticFirewall + MirrorModel

배경:
META 세 번째 관문. 의미 기반 분석 (룰 기반).
MirrorModel = 시스템 자신의 복제본을 두고 응답 일치 여부 검증.

목표:
packages/api/src/meta-layer/semantic-firewall/ 모듈.

작업:
1. SemanticFirewallService:
   - 의미 카테고리 룰 (e.g., system_prompt_leak, role_override, jailbreak_pattern)
   - 각 카테고리 정규식 + 키워드 룰
   - 매칭 시 위험도 점수 (0~100)
   - 임계값 초과 시 거부 또는 SIREN 우회
2. MirrorModelService:
   - 입력에 대한 예상 응답을 미리 계산 (룰 기반)
   - 실제 응답과 비교
   - 불일치 시 의심 마킹
3. 단위 테스트 25+

제약:
- P1: AI 없이 룰만
- P2: 의심 = 우회 (SIREN) 또는 거부

검증:
- vitest 통과
- 알려진 공격 패턴(OWASP LLM Top 10) 8개 이상 차단 확인

산출물 보고.
```

## P1.5 — SIREN 3.0 Polyintent + DeceptionGate (W3 D1~4)

```
Phase 1 - Task 5: SIREN 3.0 — Polyintent + DeceptionGate

배경:
META 마지막 관문. 차별화 핵심. 게임이론 의도 역전 + 디셉션.
특허 S-8 ~ S-11 동시 검증.

목표:
packages/api/src/meta-layer/siren/ 모듈 (가장 복잡한 모듈).

작업:
1. PolyintentService:
   - 입력에서 가능한 의도 N개 추출 (룰 기반 분류)
   - 각 의도의 확률 분포 계산
   - 의도 분산도 (entropy) 측정
   - 단일 의도가 명확한 경우 → 정상 흐름
   - 다중 의도 의심 시 → DeceptionGate
2. DeceptionGateService:
   - 의심 요청에 가짜 응답 생성 (디코이)
   - 가짜 응답 = 그럴듯하지만 정보 없음
   - 가짜 응답에 워터마크 삽입 (제로폭 문자)
   - 핑백 URL 임베드 (외부 유출 탐지)
3. HoneypotService:
   - 전경로 허니팟 엔드포인트 자동 생성 (의심 패턴별)
   - 허니팟 접근 시 즉시 AttestationChain 기록
   - 공격자 IP·세션 추적 (TB-2 ProvenanceChain 연동)
4. 게임이론 의도 역전:
   - 공격자 추정 효용 함수 (룰 기반)
   - 디코이 응답이 공격자 효용 최소화하도록 설계
5. 단위 테스트 40+

제약:
- P1, P2, P5 준수
- P8: 디코이 응답도 시간·크기 균일
- 디코이는 정상 사용자 경로에 절대 노출 X

검증:
- vitest 40+ 통과
- 디코이 응답에 워터마크 존재 확인
- 허니팟 접근 시 AttestationChain 기록 확인

산출물 보고.
```

## P1.6 — SIREN 3.0 통합 + 전경로 허니팟 (W3 D5~7)

```
Phase 1 - Task 6: SIREN 통합 + 전경로 허니팟

목표:
META-LAYER 전체 통합 + E2E 테스트.

작업:
1. MetaLayerGuard (NestJS Composite Guard):
   - TokenNorm → M-1 AllowList+GTED → SemanticFirewall+MirrorModel → SIREN
   - 각 단계 결과 메타데이터 누적
   - 최종 판정: ALLOW / DECEIVE / DENY
2. 허니팟 자동 라우팅:
   - 의심 요청 → 별도 허니팟 인스턴스
   - 정상 인스턴스와 격리
3. E2E 테스트 5종:
   - 정상 요청 → ALLOW
   - 약한 의심 → SIREN DECEIVE (디코이 응답)
   - 강한 공격 → DENY
   - 허니팟 접근 → 기록 + 추적
   - 다중 우회 시도 → 누적 점수 + 차단

검증:
- vitest E2E 5/5 통과
- tsc 0
- scan-principles 0 위반
- Phase 1 게이트 자동 검증

산출물 보고 + Phase 1 게이트 진입.
```

---

# Phase 2 — Turing Boundary (2주)

## P2.1 — TB-1 CognitiveFingerprint + TB-2 ProvenanceChain (W1)

```
Phase 2 - Task 1: TB-1 + TB-2

배경:
Turing Boundary 1~2층. AI 에이전트 신원 + 출처 추적.

작업:
1. TB-1 CognitiveFingerprintService:
   - 에이전트 행동 패턴 지문 생성 (요청 간격, 토큰 분포, 응답 패턴)
   - 지문 = 결정론적 해시 (SHA-256)
   - 신규 지문 → baseline 등록
   - 기존 지문 매칭 → 신원 확인
2. TB-2 ProvenanceChainService:
   - 모든 요청에 prevHash 포함 (P5)
   - SecurityDNA 메타 (에이전트 ID + 정책 버전 + 모델 버전)
   - 체인 단절 탐지 → P10 ConsensusGate 호출
3. AttestationChainGenesis:
   - 시스템 시작 시 genesis 블록 하드코딩 상수로 생성
   - 모든 체인의 root

검증:
- vitest 30+
- 지문 충돌률 < 0.01%
- 체인 단절 시뮬레이션 → 즉시 탐지

산출물 보고.
```

## P2.2 — TB-3 VelocityThrottle + 세션 예산 (W2 D1~3)

```
Phase 2 - Task 2: TB-3 속도 제한 + 세션 예산

작업:
1. VelocityThrottleService:
   - 다중 윈도우 RPS 측정 (10초/1분/5분/1시간)
   - 윈도우별 임계값 (정책 기반)
   - 초과 시 점진적 강등 (warn → throttle → deny)
2. SessionBudgetService:
   - 세션 생성 시 budget 발급 (e.g., 1000 토큰)
   - 매 요청 시 차감
   - budget 소진 시 → HumanGate 또는 재인증
   - PreviewBudget (ProofGate Phase 4와 통합 예정)
3. Redis 기반 카운터 (atomic)

제약:
- P2 Fail-Closed: budget 계산 실패 시 거부

검증:
- 부하 테스트로 윈도우 정확성 확인
- vitest 25+

산출물 보고.
```

## P2.3 — TB-4 ImmuneIsolation (ShadowMode) (W2 D4~5)

```
Phase 2 - Task 3: TB-4 Shadow Mode

배경:
의심 에이전트를 격리된 환경(ShadowMode)에서 관찰.
실제 시스템과 동일한 응답 패턴이지만 영향 없음.

작업:
1. ShadowModeService:
   - 의심 점수 > 임계값 → ShadowMode 전환
   - 가상 응답 생성 (P1 SIREN 활용)
   - 모든 행동 기록 (P5)
2. ImmuneIsolationGuard:
   - ShadowMode 세션은 별도 큐
   - 실제 DB 변경 X
   - 외부 호출 X

검증:
- vitest 20+
- ShadowMode 세션이 실제 DB 변경 안 함 확인

산출물 보고.
```

## P2.4 — TB-5 HumanGate + BioAuth + 채널 분리 (W2 D6~7)

```
Phase 2 - Task 4: TB-5 HumanGate (P4 강제)

배경:
가장 중요한 게이트. 인간 최종 승인.
P4: 에이전트 toolCall 목록에서 절대 제외.

작업:
1. HumanGateService:
   - 승인 요청 큐 (BullMQ)
   - BioAuth (지문/Face ID/FIDO2 키)
   - PeerVerify: 2명 동시 승인 (단일 관리자 매수 방지)
   - ApprovalFatigue 탐지 (연속 승인 패턴 → 의심)
   - 승인 만료 시간 (5분)
2. 채널 분리:
   - HumanGate API = 별도 도메인/포트
   - 별도 KMS 키링
   - 에이전트 컨테이너에서 접근 불가 (네트워크 정책)
3. 알림 채널:
   - SMS + Email + 푸시
   - 다중 채널 동시 발송

제약:
- P4 절대 준수
- 에이전트 toolCall 등록 절대 금지
- DNA Guardian이 코드 등록 시점에 검증

검증:
- vitest 30+
- HumanGate가 toolCall에 없음 확인 (자동 스캔)
- BioAuth + PeerVerify 흐름 E2E 통과

산출물 보고 + Phase 2 게이트.
```

---

# Phase 3 — Trust Cube Core (3주)

## P3.1 — L0 MultiRoot 2-of-3 (W1)

```
Phase 3 - Task 1: L0 MultiRoot (AWS/GCP/Azure 2-of-3)

작업:
1. L0 어댑터 인터페이스 (KmsAdapter):
   - sign(payload): Promise<Signature>
   - verify(payload, signature): Promise<boolean>
2. 3개 구현체:
   - AwsKmsAdapter (KMS)
   - GcpKmsAdapter (Cloud KMS)
   - AzureKmsAdapter (Key Vault)
   - 로컬 stub (개발용)
3. MultiRootService:
   - 2-of-3 합의 (3개 중 2개 성공해야 통과)
   - 1개 장애 허용
   - 2개 이상 장애 = fail-closed
4. SPIFFE 어댑터 (X.509 SVID)
5. MCPGateway stub

검증:
- 1개 장애 시뮬레이션 → 통과
- 2개 장애 → 차단
- vitest 25+

산출물 보고.
```

## P3.2 — L1 ComplyGate + DMS (W2)

```
Phase 3 - Task 2: L1 ComplyGate + C-2 DMS

작업:
1. ComplyGateService:
   - 정책 평가 엔진 (룰 기반, P1 준수)
   - HMAC 서명 검증 (Policy 변조 방지)
   - DualSign (2개 서명자 필요)
   - FPV (Formal Property Verification) 검증
2. C-2 DMS (Dead Man's Switch):
   - 트리거 조건: 정책 변조 탐지, 외부 침해 신호, Heartbeat 중단
   - Dry-Run 모드 (실제 트리거 전 미리보기)
   - 트리거 시 자동 공개 (외부 감사관에게 알림)
   - DmsTriggerLog 기록 (WORM)
3. IncidentGovernor:
   - 4단계 강등 (NORMAL → CAUTION → WARNING → CRITICAL)
   - 단계별 자동 제한

검증:
- vitest 35+
- DMS Dry-Run 테스트
- 정책 변조 → DMS 자동 트리거 확인

산출물 보고.
```

## P3.3 — L2 Seyer + TrustMetabolism + ConsensusGate (W3)

```
Phase 3 - Task 3: L2 Seyer Core

작업:
1. SeyerGate (10단계 Gate Chain):
   - Step 1: TokenNorm (Phase 1)
   - Step 2: OraclePrevention (Phase 1)
   - Step 3: PolicyGate (HMAC 캐시 무결성)
   - Step 4: SoD Gate (Separation of Duties 상태머신)
   - Step 5: Rule Engine (Default-Deny AllowList)
   - Step 6: Anomaly S-5 (5 시간 윈도우 + 공간 수렴 + CrescendoBreaker)
   - Step 7: NK Module S-7 (zero-pattern 3축 탐지)
   - Step 8: TrustMetabolism (sigmoid NonlinearDecay, A5 패치)
   - Step 9: SessionBoundary (budget enforcement)
   - Step 10: ConsensusGate (3엔진 2-of-3)
2. TrustMetabolismCron:
   - 5분마다 비활동 에이전트 신뢰도 감소
   - sigmoid 비선형 (4%/h → 1%/h)
   - 활동 시 baseline 갱신
3. ConsensusGate (P10 강제):
   - RuleEngine vote
   - AnomalyEngine vote
   - ConsensusVoter (3rd 엔진)
   - 2-of-3 동의 없으면 DENY
4. WormLogService (P3):
   - 모든 Gate Chain 결과 기록
   - prevHash 체인 (P5)

검증:
- vitest 50+
- Gate Chain 10단계 E2E
- ConsensusGate 1엔진 장애 시뮬레이션
- TrustMetabolism sigmoid 곡선 정확성

산출물 보고 + Phase 3 게이트.
```

---

# Phase 4 — ProofGate L3 (2주)

## P4.1 — preview-first + ReleaseContract + PreviewBudget (W1)

```
Phase 4 - Task 1: ProofGate Core

배경:
PG-1~7 핵심 구현. "접근이 아닌 공개를 통제".

작업:
1. PreviewEngine (PG-1):
   - 원본 즉시 공개 절대 금지
   - 합성 데이터 또는 마스킹 미리보기 생성
   - 정상 사용자: preview 보고 → 명시 요청 → 원본
2. ReleaseContract (PG-2):
   - 모든 공개 요청 = ReleaseContract 필수
   - Contract: 목적 + 범위 + 만료 + 워터마크
   - 서명 검증 (HMAC)
3. PreviewBudget (PG-3):
   - 다중 사용자가 preview 재조합으로 원본 복원 방지
   - 누적 면적 카운터
   - 면적 초과 시 HumanGate 승격
4. ApprovalFatigueDetector:
   - 연속 승인 패턴 탐지
   - 의심 시 PeerVerify 강제

검증:
- vitest 35+
- preview 재조합 시뮬레이션 → 차단

산출물 보고.
```

## P4.2 — ProofBundle + ZKBP + OutOfBandLog (W2)

```
Phase 4 - Task 2: ProofBundle + 무결성

작업:
1. ProofBundleService (PG-4):
   - 모든 공개 = ProofBundle 생성
   - 구성: contract + preview chain + 승인 흐름 + 서명
   - WORM 저장 (P3)
2. ZKBPService:
   - Zero-Knowledge Bundle Proof (수학 엔진)
   - 외부 검증 가능한 증명
3. OutOfBandLog:
   - 메인 DB와 분리된 로그
   - 별도 KMS 키
   - 시스템 침해 시에도 별도 보존
4. HeartbeatService:
   - 1분마다 시스템 생존 신호
   - 중단 시 C-2 DMS 트리거
5. MetadataGuard (PG-3 보조):
   - 메타데이터 가시성 통제
   - 권한별 필드 마스킹

검증:
- vitest 40+
- ProofBundle 무결성 검증
- Heartbeat 중단 → DMS 트리거 확인

산출물 보고 + Phase 4 게이트.
```

---

# Phase 5 — RedGate + WORM 이중 (1주)

## P5.1 — Postgres WORM 트리거 + S3 Object Lock (D1~4)

```
Phase 5 - Task 1: WORM 이중 스토리지

작업:
1. Postgres 트리거 (강화):
   - prevent_update_audit_log (이미 Phase 0)
   - prevent_delete_audit_log
   - prevent_truncate_audit_log
   - 5개 WORM 테이블 모두 (이미 Phase 0)
   - 위반 시 RAISE EXCEPTION
2. S3 Object Lock 버킷:
   - Terraform 모듈 작성
   - COMPLIANCE 모드 (Governance 아님!)
   - Retention: 7년 (기본 정책)
   - Versioning 활성화
3. WORM Sync Cron:
   - 매 시간 Postgres WORM 테이블 → S3 동기화
   - 해시 무결성 검증
   - 실패 시 즉시 알림
4. RestoreService (감사관 전용):
   - S3에서 특정 시점 복원 (read-only)
   - 감사 키 인증 필요

검증:
- Postgres UPDATE/DELETE 시도 100건 → 100건 차단
- S3 객체 강제 삭제 시도 → 거부
- 동기화 무결성 100%

산출물 보고.
```

## P5.2 — RedGate 외부 감사 인터페이스 (D5~7)

```
Phase 5 - Task 2: RedGate

작업:
1. RedGateService:
   - 외부 감사관용 read-only API
   - WORM 데이터 조회만 가능
   - 감사 키 발급 흐름 (HumanGate 승인 필수)
2. AuditQueryDsl:
   - 시간 범위 조회
   - 에이전트/세션 조회
   - 해시 체인 검증
3. RedGateDashboard (skel만):
   - Next.js 별도 (선택 - Phase 6에서 마무리)

검증:
- 감사 키 없이 접근 → 거부
- 감사 키 있을 때 → read-only 보장
- write 시도 → 거부
- vitest 25+

산출물 보고 + Phase 5 게이트.
```

---

# Phase 6 — 통합 + SDK + E2E (2주)

## P6.1 — E2E 5 시나리오 + Grok Harness (W1)

```
Phase 6 - Task 1: E2E 통합 테스트

5 시나리오:
1. 정상 흐름:
   외부 요청 → META → TB → TrustCube → ProofGate ALLOW → ProofBundle 생성
2. 공격 흐름:
   변형 토큰 → META 거부 → AuditLog 기록
3. 사고 모드:
   외부 침해 신호 → DMS 트리거 → 4단계 강등 → 자동 완화
4. 공모 시도:
   2 에이전트 preview 누적 → PreviewBudget 초과 → HumanGate 승격
5. 회복 흐름:
   장애 → ConsensusGate 1엔진 fail → 2-of-3 통과 → 정상 회복

작업:
1. test/e2e/ 폴더 5개 시나리오 작성
2. testcontainers (Postgres + Redis 실제 컨테이너)
3. Grok adversarial harness 연결:
   - 11종 알려진 공격 시뮬레이션
   - 결과 리포트 자동 생성
4. CI에 E2E 추가 (별도 job)

검증:
- 5 시나리오 100% 통과
- Grok 11종 모두 차단 (성공률 < 0.01%)

산출물 보고.
```

## P6.2 — SDK + OpenAPI + README (W2)

```
Phase 6 - Task 2: SDK + 통합 문서

작업:
1. packages/sdk/ 패키지 (@divelab/coesite-guards):
   - 클라이언트 SDK (TypeScript)
   - 3 프리셋: @public, @standard, @sensitive
   - 데코레이터 기반 (e.g., @CoesiteGuard('standard'))
   - 로컬 모드 + 원격 모드 전환
   - 로컬: TokenNorm + OraclePrevention 경량
   - 원격: 전체 게이트 체인 호출
2. OpenAPI 3.1 명세:
   - 모든 엔드포인트
   - 보안 스키마
   - 예제 응답
3. README (30분 통합 가이드):
   - 설치
   - 기본 사용
   - 3 프리셋 선택 가이드
   - 트러블슈팅
4. SDK 단위 테스트 25+

검증:
- 외부 프로젝트에서 npm install 후 동작
- OpenAPI validator 통과
- README 따라 30분 안에 통합 가능 (수동 확인)

산출물 보고 + Phase 6 게이트.
```

---

# Phase 7 — Buffer (선택, 0~2주)

## P7.1 — 외부 침투 테스트

```
Phase 7 - Task 1: 외부 보안 감사

작업:
1. 화이트박스 침투 테스트 (자체):
   - OWASP LLM Top 10 전체
   - OWASP Web Top 10
   - 시크릿 노출 스캔 (truffleHog)
2. Opus 4.7 peer review:
   - 별도 클로드 세션에서 코드베이스 리뷰
   - Critical/High/Medium 이슈 정리
3. 부족분 보강 (max 1주)
```

## P7.2 — 최종 보안 감사 리포트

```
Phase 7 - Task 2: 최종 리포트

산출물:
- SECURITY-AUDIT-REPORT.md
- E2E 결과 첨부
- Grok 결과 첨부
- Opus peer review 결과 첨부
- 알려진 한계 명시 (P0 범위 외)
- Phase P1+ 권고 사항
```

---

## 부록 A — 미세조정용 프롬프트 (Haiku 모델 권장)

```
[미세조정 / Haiku 모델 권장]
00-MASTER-PLAN.md만 읽고 (다른 파일 X) 아래 작업 실행:

{구체적 변수명 변경 / 포맷 / 주석 추가 / 단일 함수 리팩토링 등}

제약:
- 단일 파일·단일 변경
- 50 LOC 이내
- scan-principles 통과 필수
```

## 부록 B — AUTO-DEBUG 진입 프롬프트

```
[AUTO-DEBUG 7-step 시작]
01-CLAUDE.md 6번 섹션 따라 실행:
1. ERROR_CAPTURE
2. CONTEXT_LOAD  
3. HYPOTHESIS
4. ISOLATE
5. FIX
6. VERIFY
7. POST-MORTEM

대상 에러:
{에러 메시지}

3회 실패 시 즉시 HumanGate (작업 중단 + 사용자 호출).
```

## 부록 C — Phase 게이트 통과 확인 프롬프트

```
[Phase {N} 게이트 검증]
다음 3-게이트 + 추가 검증 실행:

1. npx tsc --noEmit              → 0 오류
2. npx vitest run                → 100% 통과
3. bash scripts/scan-principles.sh → 0 위반
4. bash scripts/security-wall.sh  → Mountain 0건
5. (Phase {N} 추가 검증)

모두 통과 시:
- tasks/phase{N}/RETROSPECTIVE.md 작성
- 다음 Phase 진입 승인 요청 + git tag phase{N}-complete

실패 시:
- AUTO-DEBUG 진입
```

---

*이 프롬프트 모음은 클로드 코드 14주 운영의 전체 지시서다.*
*각 Phase 시작 시 그대로 복사·붙여넣기 가능하도록 설계됨.*
