# P0.x nano naming

## 무엇을 했나

N1, N2, N3를 작업지시 영향 맵 안에서 적용했다.

- `infra/.env.example`, `packages/api/.env.example`의 DB URL 예시를 `OWNER_DATABASE_URL` + `RUNTIME_DATABASE_URL`로 통일했다.
- `infra/preflight.sh`에 owner/runtime URL의 host, port, database name 일치 검증을 추가했다.
- README에 `Phase 1 이전 runtime role 사용 가이드`를 추가하고 기존 DB URL 설명을 새 이름으로 갱신했다.

## 왜

기존 예시는 `DATABASE_URL_OWNER`, 단독 `DATABASE_URL`, `RUNTIME_DATABASE_URL`이 섞여 있었다.

이 상태에서는 migration owner URL과 application runtime URL의 책임이 흐려지고, runtime role이 PASSWORD NULL인 Phase 1 이전에 앱 실행/마이그레이션 연결 기준을 오해할 수 있다. preflight도 두 URL이 같은 DB를 가리키는지 강제하지 않아 잘못된 host, port, database 조합이 통과할 수 있었다.

## 변경 파일

- `infra/.env.example`
  - 단독 `DATABASE_URL` 제거.
  - `DATABASE_URL_OWNER`를 `OWNER_DATABASE_URL`로 변경.
  - `RUNTIME_DATABASE_URL` 유지.
- `packages/api/.env.example`
  - `DATABASE_URL_OWNER`를 `OWNER_DATABASE_URL`로 변경.
  - 단독 `DATABASE_URL` 예시를 제거하고 `RUNTIME_DATABASE_URL`로 변경.
  - Phase 1 전 `DATABASE_URL=$OWNER_DATABASE_URL` alias 권장 주석 추가.
- `infra/preflight.sh`
  - `OWNER_DATABASE_URL`, `RUNTIME_DATABASE_URL` 필수 검증 추가.
  - 두 URL의 host, port, database name 불일치 시 `exit 3`과 `URL consistency violation` 메시지로 실패하도록 추가.
  - 두 URL의 user가 같으면 misuse 위험 경고를 출력하도록 추가.
- `README.md`
  - 로컬 DB 시작 절차와 credential 동기화 표의 변수명을 새 이름으로 갱신.
  - `Phase 1 이전 runtime role 사용 가이드` 섹션 추가.
  - owner/runtime URL 설명을 `OWNER_DATABASE_URL`, `RUNTIME_DATABASE_URL` 기준으로 갱신.
- `docs/codex-log/2026-05-22-mythos-doom-nano-naming.md`
  - 이번 작업 요약본 작성.

## 검증 결과

- Gate 1 PASS: `.env.example` 두 파일에서 `OWNER_DATABASE_URL` + `RUNTIME_DATABASE_URL` 검출.
- Gate 2 PASS: `.env.example` 두 파일에 단독 `DATABASE_URL=` 잔존 0건.
- Gate 3 PASS: `infra/preflight.sh`에서 URL consistency 검증 코드, `exit 3`, `URL consistency violation` 검출. `bash -n infra/preflight.sh` 통과.
- Gate 4 PASS: README의 `Phase 1 이전 runtime role 사용 가이드` 섹션 검출.
- Gate 5 PASS:
  - `pnpm -r build` 통과.
  - `pnpm test` 통과. Vitest 1개 파일, 1개 테스트 통과.
  - 변경 파일 기준 `Mountain` scan 0건.

## 리스크 / 미해결

- 실제 `infra/.env`, `packages/api/.env`가 기존 변수명으로 남아 있으면 다음 `preflight`에서 실패한다. 새 `.env.example` 기준으로 갱신해야 한다.
- 요청 영향 맵 밖의 `package.json` Prisma scripts는 아직 `DATABASE_URL_OWNER`를 참조한다. 이번 작업 범위를 넘지 않기 위해 수정하지 않았다. 후속 task에서 `OWNER_DATABASE_URL` 기준으로 맞추거나 compatibility alias 정책을 확정해야 한다.
- `preflight.sh`의 URL parser는 현재 Postgres URL의 일반적인 `user:password@host:port/database` 형태를 기준으로 검증한다. IPv6 host 또는 특수 문자가 많은 URL은 별도 보강이 필요할 수 있다.
- 자체 codex review는 호출하지 않았다.
- git 명령은 사용하지 않았다.
