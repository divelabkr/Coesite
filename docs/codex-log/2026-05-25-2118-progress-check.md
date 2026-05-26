# 2026-05-25 진행 상태 점검

## 무엇을 했나
- 현재 저장소가 어디까지 구현됐는지 확인했다.
- 마지막 커밋 기준 구현 완료 지점은 `P1.2 OraclePrevention`이다.
- 이후 `P1.2-sub2` 보강 작업지시가 생성됐지만, 사전 검토 결과 `불통과 / 잔존 3건`으로 남아 있어 아직 구현 단계로 넘어가지 않은 상태다.

## 왜
- 사용자가 Claude로 만들던 작업의 현재 진행 위치와 실제 게이트 상태를 확인해 달라고 요청했다.
- 문서상 PASS 주장과 현재 워크트리 기준 실행 결과가 일치하는지 분리해서 확인할 필요가 있었다.

## 변경 파일
- `docs/codex-log/2026-05-25-2118-progress-check.md` — 이번 점검 결과 요약 로그를 추가했다.

## 검증 결과
- `git log --oneline -12` 확인: 마지막 커밋은 `feat(P1.2): OraclePrevention module + P1.1 BLOCKER absorption (5-round pre-review)`.
- `git status --short --branch` 확인: 현재 브랜치는 `main`, 미추적 파일이 남아 있다.
- `pnpm install --frozen-lockfile` 최초 실행은 pnpm 데이터 경로 문제로 실패했고, 프로젝트 내부 데이터 경로 지정 후 sandbox 네트워크 제한으로 실패했다.
- 네트워크 승인 후 `CI=true XDG_DATA_HOME=/mnt/c/My_Project/Coesite/.pnpm-data pnpm install --frozen-lockfile` 성공.
- `TMPDIR=/tmp XDG_DATA_HOME=/mnt/c/My_Project/Coesite/.pnpm-data pnpm prisma:generate` 최초 실행은 sandbox 네트워크 제한으로 실패했다.
- 네트워크 승인 후 `TMPDIR=/tmp XDG_DATA_HOME=/mnt/c/My_Project/Coesite/.pnpm-data pnpm prisma:generate` 성공.
- `pnpm -r build` PASS.
- `pnpm -r exec tsc --noEmit` PASS.
- `TMPDIR=/tmp pnpm test` PASS: 6 files / 72 tests.
- `TMPDIR=/tmp pnpm test:e2e` PASS: 2 files / 9 tests.
- `bash scripts/scan-principles.sh` PASS: P1~P10 위반 0.
- `bash scripts/security-wall.sh` PASS: Mountain 0 / Mine 0 / Vein 0.

## 리스크 / 미해결
- `P1.2-sub2`는 아직 구현 전이다. 최신 사전 검토 파일 `tasks/phase1/codex-out/P1.2-sub2-pre-codex-last.md`에 잔존 3건이 기록돼 있다.
- 루트 `AGENTS.md`, `.codex/`, `tasks/_template/`, `tasks/_pitfall-list.md`, `tasks/phase1/codex-out/P1.2-sub2-pre-codex-last.md`가 미추적 상태다. 의도된 산출물인지 확인 후 추적/정리 여부를 결정해야 한다.
- `docs/01-AGENTS.md`는 존재하지 않고 실제 문서는 `docs/01-CLAUDE.md`다. 루트 `AGENTS.md`와 문서명 기준이 섞여 있어 다음 작업 전 정리 기준을 정하는 것이 좋다.
- 테스트는 sandbox 안에서 로컬 포트 바인딩이 막혀 실패했고, sandbox 밖 실행으로 검증했다. 코드 실패가 아니라 실행 환경 제약으로 판단했다.
