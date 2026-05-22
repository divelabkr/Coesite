# mythos nano-nano alias

## 무엇을 했나

- `infra/.env.example`과 `packages/api/.env.example`에 `DATABASE_URL=${OWNER_DATABASE_URL}` alias를 각각 1줄 추가했다.
- 루트 `package.json`의 `prisma:migrate`, `prisma:reset` 스크립트에서 `process.env.DATABASE_URL_OWNER` 참조를 `process.env.OWNER_DATABASE_URL`로 수정했다.
- `prisma:generate` 스크립트에는 `process.env.DATABASE_URL_OWNER` 참조가 없어 변경하지 않았다.

## 왜

- Prisma schema가 `env("DATABASE_URL")`을 요구하므로, owner DB URL을 사용하는 개발/마이그레이션 경로에서도 `DATABASE_URL` alias가 필요했다.
- 기존 migration/reset 스크립트는 실제 예시 env 변수명인 `OWNER_DATABASE_URL`이 아니라 `DATABASE_URL_OWNER`를 참조해 변수명이 맞지 않았다.

## 변경 파일

- `infra/.env.example`
  - `OWNER_DATABASE_URL` 바로 아래에 `DATABASE_URL=${OWNER_DATABASE_URL}` 추가.
- `packages/api/.env.example`
  - `OWNER_DATABASE_URL` 바로 아래에 `DATABASE_URL=${OWNER_DATABASE_URL}` 추가.
- `package.json`
  - `prisma:migrate`, `prisma:reset`에서 `process.env.OWNER_DATABASE_URL`을 사용하도록 수정.
- `docs/codex-log/2026-05-22-mythos-nano-nano-alias.md`
  - 작업 요약, 변경 이유, 검증 결과, 리스크를 기록.

## 검증 결과

- `pnpm install --frozen-lockfile`: 통과.
- `prisma validate`: 통과.
  - `packages/api/.env`가 없어 파일은 만들지 않고, 현재 PowerShell 프로세스에 임시 `DATABASE_URL` 값을 설정한 뒤 `pnpm exec prisma validate --schema=prisma/schema.prisma`로 실행했다.
- `pnpm -r build`: 통과.
- `pnpm test`: 통과. Vitest 1개 파일, 1개 테스트 통과.

## 리스크 / 미해결

- 실제 `packages/api/.env` 파일은 존재하지 않아 수정하지 않았다.
- 데이터베이스 연결이 필요한 migration/reset 실행은 이번 지시 범위와 검증 명령에 포함되지 않아 수행하지 않았다.
- git 명령은 실행하지 않았다.
