# Codex Workflow Automation

## 무엇을 했나

결론: 반복되는 Coesite 수동 작업을 **skill 1개 + custom subagent 2개**로 정리했다.

만든 항목:

- Skill: `coesite-security-ops`
- Subagent: `runtime-redteam`
- Subagent: `platform-redteam`

## 왜

최근 Codex 세션에서 같은 패턴이 반복됐다.

- CI/build/test 실패 원인 분리
- `TMPDIR=/tmp`와 sandbox e2e 실패 구분
- RED 회귀 테스트 선행
- RedTeam/Gemini timeout 또는 NOT_RUN 기록
- P0/P1 리스크 장부 작성
- business/release readiness NO-GO 판정
- codex-log 작성
- dependency audit, WORM, CI coverage/e2e, OpenAPI/types/SDK 공백 점검

이제 사용자가 매번 명시하지 않아도 해당 상황에서 자동 적용한다.

## 변경 파일

- 추가:
  - `tools/codex/skills/coesite-security-ops/SKILL.md`
  - `tools/codex/agents/runtime-redteam.toml`
  - `tools/codex/agents/platform-redteam.toml`
  - `docs/codex-log/2026-05-26-0836-codex-workflow-automation.md`
- 수정:
  - `docs/08-MULTI-AI-WORKFLOW.md`
- 설치:
  - `/mnt/c/Users/yongj/.codex/skills/coesite-security-ops/SKILL.md`
  - `.codex/agents/runtime-redteam.toml`
  - `.codex/agents/platform-redteam.toml`

## 자동 적용 규칙

- CI/build/test 실패, PR/diff review, changelog/docs, release/business readiness, debugging, test classification, security preflight는 `coesite-security-ops` skill을 쓴다.
- OraclePrevention/TokenNorm/middleware/filter/controller/e2e/P8 관련 런타임 위험은 `runtime-redteam`을 쓴다.
- CI/package/lockfile/Prisma/WORM/dependency/OpenAPI/types/SDK/release readiness 위험은 `platform-redteam`을 쓴다.

## 검증 결과

- 사용자 skill 설치 확인: PASS
- project subagent 설치 확인: PASS
- 파일 내용 확인: PASS

## 리스크 / 미해결

- 현재 세션의 skill 목록은 시작 시점 기준이라 새 skill 자동 트리거는 다음 세션부터 확실하다.
- `.codex/`는 sandbox 기본 권한에서 read-only였기 때문에 설치 복사는 승인된 escalated command로 수행했다.
- 기존 `security-warden`, `test-sentinel`과 역할이 겹치지 않도록 새 subagent는 RedTeam 전용으로 좁혔다.

## 다음 액션

이후 사용자가 다음을 말하면 자동 적용한다.

- "CI 실패", "테스트 깨짐", "디버깅"
- "PR 리뷰", "diff 봐줘"
- "릴리스", "사업", "파일럿", "출시 준비"
- "문서 업데이트", "변경 로그"
- "레드팀", "취약점", "보안 점검"
