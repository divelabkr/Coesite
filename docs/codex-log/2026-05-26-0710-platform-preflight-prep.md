# Platform Preflight Prep

## 무엇을 했나

결론: **플랫폼 사전 점검판을 만들었고, P1.2-sub2 구현 GO는 아직 NO-GO**다.
감독자 Codex와 리뷰 Codex는 Phase A만 GO, 구현은 조건부 또는 NO-GO로 판정했다. Gemini CLI는 설치되어 있으나 인증 정보가 없어 NOT_RUN이다.

## 왜

이전 작업에서 환경성 실패와 보안 회귀 후보가 구현 중 뒤늦게 터졌다. 그래서 구현 전 다음을 먼저 분리했다.

- sandbox 내부 실패와 실제 코드 실패
- fast gate와 heavy gate
- Codex 역할별 책임
- RedTeam/Gemini 미실행 여부
- coverage gate 부재와 waiver 필요성

## 변경 파일

- 추가:
  - `tasks/phase1/P1.2-sub2-platform-preflight-plan.md`
  - `docs/codex-log/2026-05-26-0710-platform-preflight-prep.md`
- 코드 수정:
  - 없음

## 실행 결과

- `command -v codex`: PASS
- `command -v gemini`: PASS
- `gemini --version`: PASS, `0.42.0`
  - 단, 기본 실행 중 `/home/yongj/.gemini` 생성 경로 문제가 출력됨
- `HOME=/tmp gemini --skip-trust ...`: FAIL/NOT_RUN
  - 사유: auth 설정 없음. `GEMINI_API_KEY`, Vertex AI, 또는 GCA 설정 필요
- `pnpm -r build`: PASS
- `pnpm -r exec tsc --noEmit`: PASS
- `bash scripts/security-wall.sh`: PASS
- `bash scripts/scan-principles.sh`: PASS
  - 주의: P8/P5/P10 완전성 증명은 아님
- `pnpm test`: FAIL
  - 사유: Windows temp 경로 ENOENT로 테스트 수집 전 실패
- `TMPDIR=/tmp pnpm test` sandbox 내부: FAIL
  - 사유: `listen EPERM: operation not permitted 0.0.0.0`
- `TMPDIR=/tmp pnpm test` sandbox 밖 승인 실행: PASS
  - 6 files / 72 tests

## 다중 Codex 결과

- 감독자 Codex: 구현 GO는 NO-GO, Phase A는 GO. 사전 점검 Top 10과 명령 게이트 순서를 제안.
- 리뷰 Codex: CONDITIONAL GO. 회귀 테스트 설계와 Phase A는 가능하지만 구현 착수 전 coverage/e2e/회귀 테스트를 닫아야 한다고 판정.
- 레드팀 Codex: 이번 기록 시점까지 완료되지 않음. 완료 전 구현 GO 근거로 쓰지 않는다.
- 수행자 Codex: 로컬 명령 실행과 preflight plan 작성을 수행.
- Gemini CLI: 인증 없음으로 NOT_RUN.

## 리스크 / 미해결

- RedTeam 결과가 아직 없다. timeout이면 NOT_RUN + 사람 waiver 없이는 구현 NO-GO다.
- Gemini CLI는 auth 설정 전까지 외부 검토 축으로 사용할 수 없다.
- coverage 80%는 문서 기준이나 package/CI에 강제되지 않는다.
- `pnpm test`는 `TMPDIR=/tmp` 없이 실행하면 환경 문제로 실패한다.
- sandbox 내부 E2E는 `listen(0)` 제한으로 실패한다. PASS 주장은 sandbox 밖 승인 실행 결과와 분리해야 한다.

## 다음 액션

1. RedTeam Codex 완료 또는 timeout 기록.
2. Gemini auth를 설정할지, 이번 작업에서 waiver할지 사람 결정.
3. Phase A 이해 확인으로 safe summary envelope, request clock storage, metadata sink 확정.
4. 회귀 테스트 선행 추가.
5. E1~E6 구현.
