# Phase A 표준 양식 (작업지시 외부 참조용)

Codex가 Phase A 호출 시 다음 양식으로 응답:

```markdown
## [작업 ID] Codex 이해 확인 (Phase A)

1. 사양 핵심 복창 (한 줄씩)
2. 영향 맵 대조 (✅·❌)
3. 결정사항 처리 방안 (한 줄씩)
4. 게이트 명령어 복창
5. Docker 부재 시 처리
6. **작업지시 vs 사양 정합 의문점** (필수)
7. **영향 맵 누락·확장 후보** (필수)
8. **결정사항 모순 후보** (필수)
9. 위험 3개
10. 레드팀 우선 시각 (보안·증거 인접 시)
11. 약속 4개 [x]
   - [x] 이번 실행에서 구현하지 않음
   - [x] 영향 맵 밖 파일 수정 안 함
   - [x] git commit·push 안 함
   - [x] 모르면 추정 안 하고 의문점으로 명시
```

---

# Phase B 표준 결과 한 줄

```
[작업 ID Phase B 완료] 요약본: <경로> | 게이트: <N/M pass, K NOT_RUN>
```

---

# 작업지시 4섹션 표준 (Codex-Orchestrator 작성용 — 100줄 이내)

```markdown
# [작업 ID] 제목

**참조:** docs/03-PROMPTS.md <섹션>, docs/01-CLAUDE.md <원칙>.

## 영향 맵
- git: branch / HEAD / worktree / 예상값 일치 여부
- 호출부: 변경 함수·API·컴포넌트 호출 위치 file:line
- rules / 권한: 보호 규칙·권한 체크·feature flag 영향
- 문서: 동기 갱신 필요한 .md 섹션
- 테스트: 추가/수정/삭제할 테스트 파일·케이스

## 결정사항
- D1: <한 줄>
- D2: <한 줄>
- ...

## 게이트 (N개)
1. <명령어>
2. <명령어>
...

## 계획 대비 진행
- 상태: Planned / Phase A / Implementing / Verifying / Blocked / Done
- 진행표: 결정사항 D1..Dn별 planned / done / evidence / reviewer
- 차단 조건: P0·P1 발견, 영향 맵 불일치, 게이트 실패, 외부 의존성 미확인

## Phase A 양식
tasks/_template/work-order-phase-a.md 참조.

---

*Work Order ID: <ID>*
```

---

# 함정 list 외부 참조

`tasks/_pitfall-list.md` 자동 참조. Codex-Orchestrator는 작업지시 작성 시 dry-run check.

---

*Template version 1.0 · 2026-05-22*
