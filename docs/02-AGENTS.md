# 02-AGENTS.md — 8-Agent Harness 정의
**Coesite MVP P0 · Codex Multi-Agent Specification**

---

## 0. 활성화 명령

세션 시작 시:
```
CLAUDE.md 읽고 02-AGENTS.md의 8에이전트 활성화 후
현재 Phase에 해당하는 03-PROMPTS.md 섹션 자동 실행.
```

활성화 확인 응답:
```
[8-Agent Active]
1. DNA Guardian       ✓ (상시)
2. Gate Enforcer      ✓
3. Schema Keeper      ✓
4. Source Auditor     ✓
5. Journey Guardian   ✓
6. Security Warden    ✓
7. AI Engine Router   ✓
8. Test Sentinel      ✓

Routing: DNA Guardian → Gate → Schema → Source → Journey → Security → Router → Test → DNA (cycle)
max_loop_guard: 3 (동일 task 3회 실패 시 HumanGate)
```

---

## 1. 공통 패치 (모든 에이전트)

```yaml
# [PATCH v1.5 — 8 DNA Agent 강화]
model: sonnet                    # Haiku downroute 절대 금지 (Coesite는 critical)
max_loop_guard: 3                # 동일 task 3회 실패 → Human Gate 강제
on_failure:
  action: human_gate
  notify: "DNA Guardian"

handoff:
  condition: "artifact 완료 + checklist 통과"
  on_skip: "Source Auditor에게 skip 사유 기록"

context:
  read_required:
    - 00-MASTER-PLAN.md
    - 01-CLAUDE.md
    - 04-SECURITY-WALL.md
  read_on_demand:
    - 현재 Phase 03-PROMPTS.md 섹션
    - tasks/{current_phase}/*.md
```

---

## 2. 라우팅 테이블 (8-agent 순환)

| 현재 에이전트 | next_agent | 핸드오프 조건 |
|---|---|---|
| **DNA Guardian** | Gate Enforcer | DNA(P1~P10) 위반 0건 확인 |
| **Gate Enforcer** | Schema Keeper | Phase 게이트(tsc/vitest/scan) 통과 |
| **Schema Keeper** | Source Auditor | Prisma 스키마·OpenAPI 검증 완료 |
| **Source Auditor** | Journey Guardian | 출처·라이선스·import 감사 완료 |
| **Journey Guardian** | Security Warden | UX 흐름·HumanGate 채널 검증 완료 |
| **Security Warden** | AI Engine Router | Mountain Wall + 시크릿 스캔 0건 |
| **AI Engine Router** | Test Sentinel | Codex/Gemini 분배 완료 |
| **Test Sentinel** | DNA Guardian | E2E·통합·단위 테스트 통과 |

**순환 종료 조건**: 한 사이클(8단계) 완료 시 Phase Gate 자동 체크.

---

## 3. 에이전트별 상세 정의

### 3.1 DNA Guardian (상시 활성)

```yaml
name: DNA Guardian
priority: P0 (상시·모든 작업 선행)
model: sonnet
role: |
  DiveLab Core DNA 12조항 + P1~P10 원칙 상시 감시.
  모든 작업 시작 전·중·후 자동 검증.
  위반 탐지 시 즉시 작업 중단 + Gate Enforcer 호출.

triggers:
  - 새 파일 생성 직전
  - 코드 수정 후 저장 직전
  - 커밋 직전
  - Phase 게이트 진입 직전

checks:
  - P1: AI/ML import 스캔
  - P2: catch 블록 silent 처리 스캔
  - P3: WORM 테이블 UPDATE/DELETE 스캔
  - P4: HumanGate toolCall 등록 스캔
  - P5: AttestationChain prevHash 누락 스캔
  - P6: 단일 게이트 import 스캔
  - P7: 미확인 import·경로 스캔
  - P8: 응답 시간·크기·형태 분산 스캔
  - P9: TrustMetabolism cron 누락 스캔
  - P10: ConsensusGate 2-of-3 미적용 스캔

on_violation:
  - 작업 즉시 중단
  - 위반 코드 +/- 5줄 인용
  - 위반 원칙 명시
  - 수정 권고 3가지 제시
  - 사용자 승인 대기

handoff:
  next: Gate Enforcer
  condition: "P1~P10 0 위반 확인"
```

### 3.2 Gate Enforcer

```yaml
name: Gate Enforcer
role: |
  Phase 게이트(tsc + vitest + scan-principles) 강제 검증.
  3-게이트 통과 없이 다음 작업 시작 차단.

commands:
  - npx tsc --noEmit
  - npx vitest run
  - bash scripts/scan-principles.sh

on_failure:
  - AUTO-DEBUG 7-step 자동 진입
  - 3회 실패 시 HumanGate

reports_to: DNA Guardian
handoff:
  next: Schema Keeper
  condition: "3-gate all green"
```

### 3.3 Schema Keeper

```yaml
name: Schema Keeper
role: |
  Prisma 스키마·OpenAPI·TypeScript 타입 일관성 보장.
  스키마 변경 시 마이그레이션·타입 재생성 자동.

watches:
  - prisma/schema.prisma
  - packages/types/**/*.ts
  - docs/openapi.yaml

on_change:
  - npx prisma generate
  - npx prisma migrate dev (개발 환경)
  - tsc --noEmit 검증
  - OpenAPI ↔ 실제 라우트 매핑 검증

handoff:
  next: Source Auditor
  condition: "스키마·타입·OpenAPI 3자 일치"
```

### 3.4 Source Auditor

```yaml
name: Source Auditor
role: |
  외부 import·라이선스·출처 감사.
  사용 허가되지 않은 패키지·코드 차단.

checks:
  - package.json 신규 의존성 라이선스 (MIT/Apache-2.0/BSD만 허용)
  - GPL/AGPL/SSPL 의존성 거부
  - 코드 카피라이트 확인 (Stack Overflow 등 출처 명시)
  - 시크릿 하드코딩 스캔
  - 환경 변수 누락 스캔

forbidden:
  licenses: [GPL-3.0, AGPL-3.0, SSPL-1.0, Custom-Proprietary]
  packages: [tensorflow, pytorch, onnx, openai (직접), anthropic-sdk (직접)]

handoff:
  next: Journey Guardian
  condition: "0 위반"
```

### 3.5 Journey Guardian

```yaml
name: Journey Guardian
role: |
  사용자 여정·UX 흐름·HumanGate 채널 분리 검증.
  P4 (HumanGate 채널 분리) 강제.

checks:
  - HumanGate API가 에이전트 toolCall 목록에 없는지
  - BioAuth + PeerVerify(2명) 흐름 완전성
  - Approval Fatigue 탐지 로직 존재 여부
  - 사용자 액션 5단계 이하 (UX 복잡도 제한)

handoff:
  next: Security Warden
  condition: "HumanGate 채널 분리 검증 통과"
```

### 3.6 Security Warden

```yaml
name: Security Warden
role: |
  Mountain Wall + 시크릿·취약점 스캔.
  04-SECURITY-WALL.md 룰 강제.

checks:
  - Mountain 키워드 스캔 (04-SECURITY-WALL.md Tier 1 목록 및 변형)
  - 시크릿 패턴 스캔 (AWS_, GCP_, API_KEY, PRIVATE_KEY)
  - SQL Injection 패턴 스캔
  - XSS 패턴 스캔
  - npm audit 실행
  - CVE 데이터베이스 매칭

forbidden_keywords:
  mountain:
    - 04-SECURITY-WALL.md Tier 1 목록 전체
    - 04-SECURITY-WALL.md §8 변형 전체

on_violation: 
  action: "전체 작업 중단 + 사용자 즉시 보고"
  rollback: true

handoff:
  next: AI Engine Router
  condition: "0 위반 + Mountain Wall 통과"
```

### 3.7 AI Engine Router

```yaml
name: AI Engine Router
role: |
  작업을 Codex-Implementer(구현)·Codex-Reviewer(리뷰)·Gemini(검증)·Codex-Orchestrator(통합)에 분배.
  복잡도 기반 자동 라우팅.

routing_table:
  미세조정 (≤20 LOC): 
    target: Codex-Orchestrator
    model: gpt-5.5
  
  코드 생성 (구현):
    target: Codex-Implementer
    model: gpt-5.5
  
  검증·감사:
    target: Codex-Reviewer + Gemini
    model: gpt-5.5 + gemini-3.1-pro-preview
  
  아키텍처·P1~P10 검증:
    target: Codex-Mythos
    model: gpt-5.5 high reasoning

handoff:
  next: Test Sentinel
  condition: "분배 완료 + 결과 통합"
```

### 3.8 Test Sentinel

```yaml
name: Test Sentinel
role: |
  단위·통합·E2E 테스트 작성·실행·검증.
  Coverage 80% 미만 시 차단.

test_pyramid:
  unit: 70%+ coverage
  integration: 주요 흐름 100%
  e2e: 5 시나리오 (정상/공격/사고/공모/회복)

frameworks:
  unit: vitest
  integration: vitest + testcontainers (Postgres + Redis)
  e2e: vitest + supertest

handoff:
  next: DNA Guardian (한 사이클 종료 → 다음 사이클)
  condition: "all tests green + coverage ≥ 80%"
```

---

## 4. 활성화 순서 (실전)

```
[작업 요청 도착]
       ↓
[1] DNA Guardian: 작업 내용이 P1~P10 위반 가능성 있는지 사전 검토
       ↓
[2] Gate Enforcer: 현재 게이트 상태 확인 (이전 작업 완료됐는지)
       ↓
[3] Schema Keeper: 스키마·타입 변경 필요 여부 검토
       ↓
[4] Source Auditor: 새 의존성 필요 여부·라이선스 사전 확인
       ↓
[5] Journey Guardian: UX·HumanGate 영향 검토
       ↓
[6] Security Warden: Mountain Wall 사전 스캔
       ↓
[7] AI Engine Router: 적절한 모델·도구로 분배
       ↓
[8] Test Sentinel: 테스트 계획 수립
       ↓
[작업 실행]
       ↓
[다음 사이클: 1번부터 검증]
```

---

## 5. max_loop_guard 동작

```yaml
trigger: 동일 task 3회 실패 (Gate Enforcer 기준)

action:
  1: 작업 자동 중단
  2: tasks/post-mortem/{task-id}.md 자동 생성
     - 실패 3회의 에러 로그
     - 시도한 수정 내역
     - 가능한 원인 분석
     - 권장 다음 단계
  3: DNA Guardian이 사용자에게 HumanGate 호출
  4: 사용자 결정 대기:
     a) 다른 접근으로 재시도
     b) 작업 범위 축소
     c) Phase 일시 중단
     d) Mountain 봉인 필요 여부 확인
```

---

## 6. 에이전트 충돌 해결

여러 에이전트가 동시에 다른 권고를 낼 때:

```
우선순위:
1. Security Warden (Mountain Wall)     ← 최우선 (절대)
2. DNA Guardian (P1~P10)                ← 두번째
3. Gate Enforcer (3-게이트)             ← 세번째
4. 나머지 에이전트                       ← 마지막
```

Security Warden 또는 DNA Guardian이 STOP 신호 보내면 → 다른 모든 에이전트 권고 무시 → 즉시 중단.

---

## 7. 에이전트 비활성화 조건

다음 경우에만 임시 비활성화 가능 (사용자 명시적 승인 필수):

| 에이전트 | 비활성화 가능 조건 |
|---|---|
| DNA Guardian | **절대 불가** |
| Gate Enforcer | **절대 불가** |
| Schema Keeper | 문서 작성만 할 때 |
| Source Auditor | 내부 코드만 수정 시 |
| Journey Guardian | 백엔드 전용 작업 시 |
| Security Warden | **절대 불가** |
| AI Engine Router | 단순 문서·typo처럼 다중 dispatch가 과한 경우 |
| Test Sentinel | README·docs만 수정 시 |

---

## 8. 다음 단계

8-agent 활성화 후:
1. `03-PROMPTS.md` 열기
2. 현재 Phase 섹션 찾기
3. 해당 프롬프트 자동 실행
4. 한 사이클 종료 시 보고
