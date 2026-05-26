# 08-MULTI-AI-WORKFLOW.md — Codex 중심 다중 AI 작업 운영

**목표:** Coesite 작업을 `계획 → 교차검증 → 구현 → 검증 → 사람 승인` 구조로 고정한다. AI는 최종 판단자가 아니라, 사람이 더 잘 판단하도록 근거와 선택지를 압축하는 증폭 장치다.

---

## 0. 역할 분담

| 역할 | 책임 | 산출물 |
|---|---|---|
| Codex-Orchestrator | 작업지시 작성, 계획 대비 진행표 관리, 검증 결과 종합, 결재 자료 작성 | workorder, Executive Summary, 진행표 |
| Codex-Implementer | 파일 읽기·수정·구현·테스트·요약 로그 작성 | code, tests, `docs/codex-log/*.md` |
| Codex-Reviewer | read-only 교차검증, 작업지시 결함 8종 점검, P1~P10 리뷰 | review finding |
| Codex-RedTeam | 보안·증거 인접 작업의 공격자 시각 검토 | scenario matrix |
| Codex-Mythos | 변곡점·페이즈 전환의 foundational skeptic-architect 검토 | systemic risk review |
| Gemini | 다른 시각 첨언, UX·아키텍처·대안·누락 검토 | short external review |
| 사장님 | 최종 결재·승인·보류 | GO / CONDITIONAL GO / NO-GO |

Codex가 여러 역할을 맡더라도 **동일 dispatch에서 구현과 최종 판정을 섞지 않는다**. 구현자는 만들고, 리뷰자는 read-only로 의심하고, Orchestrator는 요약해서 사람에게 올린다.

---

## 1. 계획 대비 진행 구조

모든 LARGE 작업은 `tasks/{phase}/{task}.md`에 다음 표를 가진다.

| 항목 | 상태 | 근거 |
|---|---|---|
| Work Order | Planned / Revised / Approved | 작업지시 경로 |
| Phase A 이해 확인 | Pending / Done / Blocked | Codex Phase A 출력 |
| 구현 | Pending / Done / Blocked | 변경 파일 목록 |
| 단위 검증 | Pending / PASS / FAIL / NOT_RUN | 명령 출력 요약 |
| 교차검증 | Pending / PASS / FAIL / WAIVED | Codex/Gemini/RedTeam/Mythos 결과 |
| 최종 요약 | Pending / Done | `docs/codex-log/*.md` |
| 사람 게이트 | Pending / GO / CONDITIONAL GO / NO-GO | 승인 메모 |

상태가 `Blocked`, `FAIL`, `NOT_RUN`이면 다음 작업으로 넘어가지 않는다. 예외는 사용자가 명시 승인한 경우만 허용하고, 로그에 그대로 적는다.

---

## 2. 작업 파이프라인

### Step 0 — Codex-Orchestrator 작업지시
- 목적, 범위, 금지 영역, 영향 맵 5축, 게이트, 교차검증 축을 명시한다.
- 보안·증거 인접 또는 Phase 전환이면 RedTeam/Mythos를 자동 포함한다.

### Step 0.5 — Pre-Phase A 작업지시 검토
- Codex-Reviewer: 작업지시 결함 8종을 read-only 검토한다.
- Gemini: 짧은 외부 시각 첨언을 낸다.
- Orchestrator: 결함을 반영해 workorder를 수정한다.

### Step 1 — Phase A 이해 확인
- Codex-Implementer는 구현 전 영향 맵 5축을 다시 대조한다.
- 작업지시 결함 자가 점검을 반드시 출력한다.
- 영향 맵이 실제와 다르면 구현하지 않고 중단한다.

### Step 2 — 구현
- 버그 수정은 회귀 테스트 먼저 작성한다.
- 새 기능은 정상 경로와 엣지 케이스 테스트를 함께 추가한다.
- 구현 후 `docs/codex-log/`에 실패·미검증까지 포함한 요약본을 남긴다.

### Step 3 — 검증 다축
- Codex-Reviewer: 변경 요약과 diff를 검토한다.
- Gemini: 대안·누락·UX·아키텍처 관점 첨언.
- Codex-RedTeam: 보안·증거 인접 시 필수.
- Codex-Mythos: 변곡점·페이즈 전환 시 필수.

### Step 4 — Codex-Orchestrator 종합
- Executive Summary 50줄 이내.
- P0/P1/P2/P3 라벨링.
- 계획표의 각 결정사항이 실제 변경·테스트·리뷰 근거와 연결됐는지 체크한다.

### Step 5 — 사장님 결재
- GO: 다음 작업 진행.
- CONDITIONAL GO: 지정 조건만 보완 후 진행.
- NO-GO: 작업 중단 또는 workorder 재작성.

---

## 3. 영향 맵 5축

```markdown
## 영향 맵
- git:
  - branch:
  - HEAD:
  - worktree:
  - 예상값과 일치 여부:
- 호출부:
  - 변경되는 함수·API·컴포넌트 호출 위치 file:line
- rules / 권한:
  - 보호 규칙·권한 체크·feature flag 영향
- 문서:
  - 동기 갱신 필요한 .md 섹션
- 테스트:
  - 추가/수정/삭제할 테스트 파일·케이스
```

git 축이 맞지 않으면 즉시 중단한다. 잘못된 worktree에서의 성공은 성공으로 보지 않는다.

---

## 4. 작업지시 결함 8종

| # | 카테고리 | 차단 기준 |
|---|---|---|
| 1 | 범위 결함 | 좁아서 누락되거나 넓어서 hang 위험 |
| 2 | 금지 조항 누락 | 변경 금지 파일·영역 미명시 |
| 3 | 검증 기준 모호 | "잘 동작" 같은 비측정 기준 |
| 4 | 영향 맵 5축 누락 | git/호출부/rules/문서/테스트 중 누락 |
| 5 | 회귀 우선 미적용 | 버그 수정인데 실패 테스트 선행 없음 |
| 6 | 배치/Mythos 트리거 누락 | 변곡점인데 심층 검증 없음 |
| 7 | 토큰 폭발 위험 | 한 dispatch에 작성+구현+검증+문서 과밀 |
| 8 | 외부 의존성 미고지 | emulator·secret·credential·network 미고지 |

---

## 5. Executive Summary 강제

무거운 검증 dispatch는 본문 첫 부분에 다음 형식을 둔다.

```markdown
## Executive Summary

**결론 (한 문장)**: GO / CONDITIONAL GO / NO-GO + 핵심 사유

**합의된 P0**:
- [P0-1] ... — 근거: file:line

**합의된 P1**:
- [P1-1] ... — 근거: file:line

**이견·미해결**:
- Codex vs Gemini 차이

**차단 항목**:
- 사장님 결재 차단 사유

**근거 파일**:
- docs/codex-log/<file>.md
```

Orchestrator는 기본적으로 Executive Summary를 먼저 읽고, 의심되는 항목만 상세를 펼친다.

---

## 6. Mythos 자동 발동

다음 중 하나라도 있으면 Codex-Mythos를 1회 발동한다.

- P0/P1 작업 완료
- 새 API/함수/모듈 추가
- 권한·스키마·보안 규칙 변경
- secret/key 추가·변경·회전
- 데이터 마이그레이션
- audit log·해시 체인·증거 로직 변경
- IAM·인증 wrapper·rate limit 변경
- 외부 통합 추가
- dev → staging → prod 같은 환경 전환
- 실데이터 투입, 파일럿, 정식 런칭, 사고 후 RCA

단순 문구·typo·테스트 전용 수정은 자동 발동하지 않는다. 생략은 사용자가 `Mythos 생략`을 명시한 경우만 허용한다.

---

## 7. 현재 적용 지점

현재 구현 완료 기준점은 **P1.2 OraclePrevention final**이다. 다음 작업은 **P1.2-sub2 작업지시 보정**부터 이 워크플로우로 진행한다.

첫 적용 순서:
1. `tasks/phase1/P1.2-sub2-codex-multi-ai-plan.md`에 계획 대비 진행표 작성.
2. `tasks/phase1/P1.2-sub2-essential-workorder.md`의 잔존 3건 보정.
3. Codex-Reviewer + Gemini로 Pre-Phase A 재검토.
4. GO일 때만 구현.

---

## 8. 자동 적용 Skill / Subagent

반복 작업은 다음 규칙으로 자동 적용한다. 사용자가 매번 이름을 말하지 않아도 된다.

| 상황 | 자동 적용 |
|---|---|
| CI 실패, build/test 실패, 디버깅, 테스트 분류, PR/diff 리뷰, 문서/changelog, release/business readiness | `coesite-security-ops` skill |
| OraclePrevention, TokenNorm, middleware/filter/controller/e2e, P8, request clock, header/size/time/status/body/error leak | `runtime-redteam` subagent |
| CI, package/lockfile, Prisma/migration, WORM/prevHash, dependency audit, secret scan, OpenAPI/types/SDK, release/business readiness | `platform-redteam` subagent |

적용 원칙:
- skill은 반복 절차와 명령 순서를 줄이기 위한 것이다.
- subagent는 독립 조사/검토 역할이 필요할 때만 쓴다.
- 구현과 최종 판정을 같은 dispatch에 섞지 않는다.
- RedTeam 결과가 timeout/NOT_RUN이면 GO 근거로 쓰지 않는다.
- 사업/파일럿/릴리스 언급이 나오면 `tasks/phase1/business-preflight-risk-register.md`를 먼저 확인한다.

---

## 9. RedTeam 시간 예산 정책

RedTeam은 빠른 통과용 검사가 아니라, 누락·회귀·우회·운영 사고를 오래 의심하는 검증 축이다. 시간 초과는 안전 확인이 아니라 증거 공백으로 기록한다.

| 모드 | subagent당 시간 예산 | 적용 기준 |
|---|---:|---|
| Quick | 최대 10분 | 작은 패치 sanity check. 보안·릴리스·사업 판단에 사용 금지 |
| Standard | 최대 20분 | 단일 모듈, 집중 회귀, 일반 P1/P2 코드 리뷰 |
| Deep | 45~60분 | 사업, 파일럿, 릴리스, production, P0/P1, dependency audit, CI gate, WORM, prevHash, oracle, auth, schema, platform readiness |
| Split Deep | 각 45~60분 | runtime과 platform surface가 모두 걸릴 때 `runtime-redteam`, `platform-redteam`을 분리 실행 |

자동 승격:

- 사용자가 "사업", "파일럿", "릴리스", "배포", "진짜 안전한지", "취약점", "완벽한 보안게이트"를 언급하면 Deep으로 본다.
- P0/P1 리스크가 하나라도 남아 있으면 Quick 검증을 GO 근거로 쓰지 않는다.
- timeout, capacity, tool failure는 `NOT_RUN` 또는 `PARTIAL`로 기록하고, GO 판단에서 제외한다.

운영 규칙:

1. Deep RedTeam은 넓게 한 번 던지기보다 runtime/platform/CI/dependency/WORM처럼 축을 쪼갠다.
2. 첫 산출물은 P0/P1 요약을 먼저 요구하고, 상세 matrix는 뒤에 둔다.
3. 재시도는 같은 프롬프트 반복이 아니라 범위를 좁힌 별도 dispatch로 한다.
4. P0/P1은 file:line 근거가 있을 때만 blocker로 확정한다.
5. 근거 없는 의심은 backlog로 남기되, business GO 근거로도 쓰지 않는다.
