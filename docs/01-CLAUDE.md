# CLAUDE.md — Coesite MVP P0 프로젝트 헌법
**DiveLab AI Trust Security Protocol · Claude Code 작업 절대 규칙**

---

## ⚠️ 세션 시작 의무 (어김 시 작업 중단)

새 세션마다 다음 순서로 반드시 읽는다:

```
1. docs/00-MASTER-PLAN.md     (현재 Phase 확인)
2. docs/01-CLAUDE.md          (이 파일·헌법)
3. docs/02-AGENTS.md          (8-agent 활성화)
4. docs/04-SECURITY-WALL.md   (Mountain급 차단 룰)
5. 현재 Phase에 해당하는 docs/03-PROMPTS.md 섹션
```

세션 첫 응답에 다음을 출력해야 한다:
```
[Coesite Session Start]
- 현재 Phase: P{n}
- 진행 중인 작업: {작업명}
- 활성 에이전트: DNA Guardian + {역할별 에이전트}
- 마지막 게이트: {tsc/vitest/scan 결과}
- 다음 액션: {구체적 단계}
```

---

## 1. 프로젝트 정체성

```yaml
이름:        Coesite MVP P0
브랜드:      DiveLab → TEP → Coesite → Trust Stack(CG/SY/PG) + Norn + RedGate
역할:        AI Trust Security Protocol
라이선스:    BSL (Business Source License)
런타임:      Node.js 22 + NestJS 10 + TypeScript 5.4 strict
DB:          PostgreSQL 16 (Prisma 5) + Redis 7 (BullMQ)
배포:        AWS ECS Fargate (asia-northeast-2) + Terraform
WORM:        Postgres 트리거 + S3 Object Lock COMPLIANCE 7년 (이중)
기본 흐름:   Plan → Act → Verify (Generate → Verify → Approve → Merge)
출시 목표:   2027 Q1
```

---

## 2. DiveLab Core DNA (12조항) — 전제품 공통

```
핵심 선언: "판단않는다. 통제하고 기록한다."

①  파편 정보·기회·제도 연결 (정보제공/통제/기록 병기)
②  실행 "이어질 수 있도록 구조 설계" (직접 실행 X·법적 방어선 핵심)
③  AI = 실행 보조자·판단자 아님
④  사용자 통제권 우선
⑤  핵심 행위 검증 가능 (사후 확인)
⑥  책임 행위 단위 분리 (제공/추천/요청/승인/증빙/보관)
⑦  위험도 비례 통제
⑧  생활 비효율 감소
⑨  결과 증빙 잔존 구조
⑩  제품 분리·엔진 철학 공유
⑪  완벽함보다 완주율
⑫  지불 주체·반복 수요 의식
```

용도: **법적 방어선 + 코드 레벨 강제**. 가독성 희생해도 강도 유지.

---

## 3. 코드 레벨 절대 원칙 P1~P10 (위반 시 즉시 작업 중단)

### P1. 비판단 (Non-Judgment)
- AI/ML 모델 출력을 판단에 사용 금지
- 허용 목록(AllowList) + 규칙(Rules)만으로 행동 통제
- **금지 import**: `tensorflow`, `pytorch`, `onnx`, `*.predict(`, `new NeuralNet`
- **금지 표현**: `eligible: true/false`, `decision: 'APPROVED'`, `shouldPay: boolean`
- **허용 표현**: `signals: { riskScore: 0~100, confidence: 0~1, flags: [...] }`

### P2. Fail-Closed
- 모든 예외 = DENY (절대 ALLOW 폴백 금지)
- `catch (e) { /* continue */ }` 절대 금지
- `try-catch` 끝에 명시적 `throw` 또는 `return DENY`
- 외부 의존 장애 시 = 항상 거부 방향

### P3. WORM 불변
- **대상 테이블**: `AuditLog`, `WormLog`, `AdminActionLog`, `DmsTriggerLog`, `ProofBundle`
- UPDATE/DELETE 절대 금지 (INSERT ONLY)
- Postgres BEFORE UPDATE/DELETE 트리거로 차단
- S3 Object Lock COMPLIANCE 모드로 이중 백업
- 보관 기간: 7년

### P4. HumanGate 채널 분리
- HumanGate 호출은 에이전트 toolCall 목록에서 **반드시 제외**
- 다른 서비스가 HumanGate 직접 호출 금지 (별도 채널)
- BioAuth + 2명 동시 승인(PeerVerify) 필수
- HumanGate API 키는 별도 KMS 키링

### P5. AttestationChain 연속성
- 모든 행동 기록은 `prevHash` 포함
- 체인 검증 없는 기록 INSERT 금지
- 시작 블록 (genesis) = 하드코딩된 상수
- 체인 단절 감지 시 = P10 ConsensusGate 자동 발동

### P6. 결합의존 (FR 연동)
- Foundation Root API는 stub로 구현 (P0)
- CG + SY + PG 단독 사용 불가 설계 (반드시 함께 동작)
- 단일 제품만 import 시 빌드 실패 처리
- 의존 방향: `Facil → Seyer → ComplyGate` (단방향)

### P7. 환각 금지
- 미확인 import 금지 (`tsc --noEmit` 0 오류 필수)
- 존재하지 않는 경로 참조 금지
- 결과 주장 시 반드시 실제 실행 후 출력 첨부
- 존재하지 않는 데코레이터 금지

### P8. Oracle Prevention
- 모든 응답의 시간·크기·형태 균일화
- `OraclePreventionInterceptor`: 최소 시간 padding (e.g., 200ms)
- `UniformError`: 모든 거부 응답 = 동일 메시지 + 동일 status code
- `SizePadding`: 응답 크기 K-segment 단위로 패딩
- EML 트리(`eml(x,y) = exp(x) - ln(y)`) 통일 호출

### P9. Trust Metabolism
- 비활동 에이전트 신뢰도 자동 감소
- 24시간 비선형 감쇠 (sigmoid): 4%/h → 1%/h
- 활동 = baseline 갱신 + 신뢰도 회복
- Cron: 매 5분 갱신

### P10. Consensus Required
- 3개 독립 판정 엔진 2-of-3 합의 없이 행동 허용 금지
- 엔진 = `RuleEngine` + `AnomalyEngine` + `ConsensusVoter`
- 1 엔진 장애 시 fail-closed
- 응답 시간 균일화 (P8 연동)

---

## 4. Mountain급 봉인 (절대 노출 금지)

다음 키워드/개념은 클로드 코드 컨텍스트, 코드 주석, 커밋 메시지, README, 변수명, 함수명, 어떤 곳에도 등장 금지:

```
금지 키워드 (즉시 차단):
  04-SECURITY-WALL.md §1 Tier 1 목록 전체
  04-SECURITY-WALL.md §8 변형 전체
```

탐지 시:
1. 작업 즉시 중단
2. 사용자에게 보고: "Mountain급 키워드 탐지 — 작업 중단"
3. 해당 컨텍스트 폐기
4. Security Wall 재검증 후 재시작

자세한 룰은 `04-SECURITY-WALL.md` 참조.

---

## 5. 작업 흐름 (Plan → Act → Verify)

### Plan 단계
- 작업 크기 분류: **SMALL** (≤50 LOC, 단일 파일) / **LARGE** (>50 LOC 또는 다중 파일)
- SMALL → 바로 Act
- LARGE → 계획서 먼저 작성 → 사용자 승인 → Act
- 모든 계획은 `tasks/{phase}/{task}.md`에 기록

### Act 단계
- 한 번에 한 파일
- 매 파일 생성 후 즉시 `tsc --noEmit` 부분 확인
- 매 50 LOC 작성 후 vitest 케이스 1개 이상 추가
- 외부 import 추가 시 즉시 `npm install` 확인

### Verify 단계 (3-게이트)
```bash
# 게이트 1: 타입 검증
npx tsc --noEmit    # 0 오류 필수

# 게이트 2: 단위 테스트
npx vitest run      # 100% 통과 필수

# 게이트 3: 원칙 스캔
bash scripts/scan-principles.sh   # P1~P10 0 위반 필수
```

3-게이트 통과 못 하면 → 다음 작업 시작 금지 → AUTO-DEBUG 7-step 진입.

---

## 6. AUTO-DEBUG 7-step (게이트 실패 시)

```
1. ERROR_CAPTURE   에러 메시지·스택·환경 전체 캡처
2. CONTEXT_LOAD    실패 직전 변경 파일 3개 reload
3. HYPOTHESIS      가능한 원인 3가지 나열 (확률 표시)
4. ISOLATE         최소 재현 케이스 작성 (격리 테스트)
5. FIX             1가지만 수정 (한 번에 한 변경)
6. VERIFY          3-게이트 재실행
7. POST-MORTEM     실패 원인을 tasks/post-mortem.md에 기록
```

3회 실패 시 → 사용자 HumanGate 호출 → 작업 일시 중단.

---

## 7. 디렉토리 구조 (P0 최종)

```
coesite/
├── packages/
│   ├── types/                  # 공유 타입 (Coesite 전체)
│   ├── utils/                  # 공유 유틸 (hash, crypto, jwt)
│   ├── api/                    # 메인 백엔드 (NestJS)
│   │   ├── src/
│   │   │   ├── meta-layer/    # Phase 1 (TokenNorm, AllowList, SIREN)
│   │   │   ├── turing/        # Phase 2 (TB-1~TB-5)
│   │   │   ├── trust-cube/    # Phase 3 (L0~L2)
│   │   │   ├── proof-gate/    # Phase 4 (L3)
│   │   │   ├── red-gate/      # Phase 5 (외부 감사)
│   │   │   ├── worm/          # P3 강제 (트리거 + S3)
│   │   │   ├── consensus/     # P10 강제 (3엔진 2-of-3)
│   │   │   └── common/        # OraclePrevention 등 횡단 관심사
│   │   └── test/
│   └── sdk/                    # Phase 6 (@divelab/coesite-guards)
├── infra/
│   ├── terraform/              # AWS ECS Fargate + S3 + KMS
│   └── docker-compose.yml      # 로컬 (Postgres + Redis)
├── scripts/
│   ├── scan-principles.sh      # P1~P10 자동 검증
│   ├── security-wall.sh        # Mountain급 차단 스캔
│   └── auto-debug.sh           # 7-step 자동화
├── docs/
│   ├── 00-MASTER-PLAN.md       # 이 마스터 플랜
│   ├── 01-CLAUDE.md            # 이 파일
│   ├── ... (08-FILE-STRUCTURE.md까지)
│   └── openapi.yaml            # API 명세
├── tasks/                      # Plan·Post-Mortem
│   ├── phase0/
│   ├── phase1/
│   └── ...
├── .github/workflows/          # CI/CD (3-게이트)
└── CLAUDE.md                   # 이 파일의 사본 (루트)
```

---

## 8. 에이전트 역할 분담

```
Claude (오케스트레이터):
  - 설계 결정 + 코드 분석 + 최종 판단
  - Phase 게이트 검증
  - 8-agent 활성화·조율

Codex (구현자):
  - 코드 생성 (Sonnet 4 모델)
  - 타입 엄격성 준수
  - 테스트 코드 작성

Gemini (검증자):
  - 결과물 품질 감사
  - 보조 리뷰 (1M 컨텍스트 활용)

Claude Code (검증자):
  - tsc·vitest·scan 실행
  - PR 리뷰
  - DNA Guardian + 7 sub-agent 활성화
```

자세한 8-agent 정의는 `02-AGENTS.md` 참조.

---

## 9. 절대 금지 사항 (위반 시 전체 롤백)

| # | 금지 행위 | 사유 |
|---|---|---|
| F1 | AI/ML import 또는 `.predict()` 호출 | P1 위반 |
| F2 | `catch { /* pass */ }` 또는 silent error | P2 위반 |
| F3 | WORM 테이블에 UPDATE/DELETE SQL | P3 위반 |
| F4 | HumanGate를 에이전트 toolCall로 등록 | P4 위반 |
| F5 | prevHash 없는 audit 레코드 INSERT | P5 위반 |
| F6 | 단일 게이트(CG·SY·PG 중 하나)만 import | P6 위반 |
| F7 | 미실행 결과를 "성공"으로 주장 | P7 위반 |
| F8 | 응답 시간 random 또는 가변 size | P8 위반 |
| F9 | 신뢰도 baseline 갱신 누락 | P9 위반 |
| F10 | 단일 엔진 판정만으로 ALLOW 반환 | P10 위반 |
| F11 | Mountain급 키워드 사용 (Security Wall Tier 1 목록 및 변형) | 봉인 위반 |
| F12 | API 키·시크릿 하드코딩 | 보안 위반 |
| F13 | 게이트 통과 없이 다음 Phase 진입 | 흐름 위반 |
| F14 | "이 정도면 됐다"식 검증 생략 | 완료 기준 위반 |

---

## 10. 보고 양식 (매 작업 종료 시)

```markdown
## [Phase X · Task Y] 작업 보고

### 변경 사항
- 추가 파일: {경로 리스트}
- 수정 파일: {경로 리스트}
- 삭제 파일: {경로 리스트}

### 게이트 결과
- tsc --noEmit: {0 오류 / N 오류}
- vitest: {통과/실패 + 케이스 수}
- scan-principles: {0 위반 / N 위반 (상세)}

### P1~P10 자가 진단
- P1 비판단: ✅/❌
- P2 Fail-Closed: ✅/❌
- ... (P10까지)

### Mountain Wall 검증
- 금지 키워드 탐지: 0건/N건

### 다음 액션
- {구체적 다음 단계}
```

---

## 11. 변경 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| v1.0 | 2026.05.21 | 초기 작성 |

---

*이 문서는 Coesite MVP P0 작업의 절대 규칙이다. 모든 클로드 코드 세션은 이를 준수해야 한다.*
