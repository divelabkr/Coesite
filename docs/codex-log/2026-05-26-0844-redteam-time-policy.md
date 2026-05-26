# RedTeam Time Policy Update

## 무엇을 했나

RedTeam 검증을 quick/standard/deep 3단계로 분리하고, 사업·파일럿·릴리스·보안 인접 작업은 Deep RedTeam으로 자동 승격하도록 문서와 skill/subagent 정의를 갱신했다.

## 왜

이전 정의는 RedTeam 필수 여부는 명확했지만, 얼마나 기다릴지와 timeout을 어떻게 판정할지가 부족했다. 그 결과 시간 초과나 부분 결과가 안전 확인처럼 오해될 수 있었다.

## 변경 파일

- `docs/08-MULTI-AI-WORKFLOW.md`: RedTeam 시간 예산 정책과 자동 승격 기준 추가.
- `tools/codex/skills/coesite-security-ops/SKILL.md`: 반복 작업 skill에 RedTeam time budget 추가.
- `tools/codex/agents/runtime-redteam.toml`: runtime RedTeam deep budget과 timeout 판정 규칙 추가.
- `tools/codex/agents/platform-redteam.toml`: platform RedTeam deep budget과 timeout 판정 규칙 추가.
- `tasks/phase1/P1.2-sub2-platform-preflight-plan.md`: Gate 5를 Deep RedTeam 기준으로 보강.
- `tasks/phase1/business-preflight-risk-register.md`: 사업 GO 조건에 runtime/platform Deep RedTeam 완료 조건 반영.

## 검증 결과

- 문서/워크플로우 변경만 수행했다.
- 설치된 사용자 skill 동기화: PASS
  - `/mnt/c/Users/yongj/.codex/skills/coesite-security-ops/SKILL.md`
- 설치된 subagent 동기화: PASS
  - `.codex/agents/runtime-redteam.toml`
  - `.codex/agents/platform-redteam.toml`
- 원본과 설치본 diff 확인: PASS
- `bash scripts/security-wall.sh`: PASS
- `bash scripts/scan-principles.sh`: PASS
- 코드 동작 변경은 없으므로 전체 테스트는 실행 대상에서 제외했다. 현재 P1.2-sub2 회귀 테스트는 의도적으로 RED 상태다.

## 리스크 / 미해결

- Deep RedTeam은 시간이 오래 걸리므로, runtime/platform 범위를 분리해 실행해야 한다.
- RedTeam timeout은 PASS가 아니라 NOT_RUN/PARTIAL로 남긴다.
- 실제 다음 RedTeam 실행 시 subagent wait budget을 45~60분으로 주어야 한다.
