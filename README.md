# Coesite

## 사전 요구사항

- Node 22 (`.nvmrc` 기준)
- pnpm 10 (`package.json`의 `packageManager` 기준)
- Docker 및 Docker Compose 플러그인: 로컬 Postgres/Redis가 필요할 때만 사용

## 세션 시작 의무

작업 세션을 시작할 때는 `01-CLAUDE.md` §1을 먼저 확인한다. 헌법과 보안 벽을 우회하지 않는다.

## 프로젝트 시작

```powershell
pnpm install
pnpm -r build
pnpm test
```

`pnpm test`는 Vitest를 실행한다.

패키지 단위 실행:

```powershell
# 전체 빌드
pnpm -r build
# 특정 패키지만 실행
pnpm --filter @coesite/api dev
pnpm --filter @coesite/api test
```

## 로컬 DB 시작

1. `cp infra/.env.example infra/.env`
2. `infra/.env` 값 교체: `POSTGRES_PASSWORD`, `REDIS_PASSWORD` 등 모든 placeholder를 실제 값으로 교체한다.
3. `cp packages/api/.env.example packages/api/.env`
4. `packages/api/.env` 값 교체: `DATABASE_URL`, `REDIS_URL`의 password를 `infra/.env`와 동기화하고, `JWT_SECRET`을 `openssl rand -hex 32` 결과로 교체한다.
5. `pnpm db:up` # preflight 자동 실행 -> docker compose up

`postgres`와 `redis` 서비스 상태가 `healthy`인지 확인한다.

Redis는 개발 환경에서도 `REDIS_PASSWORD` 인증을 요구한다. `infra/.env`를 만들면 기본 placeholder를 로컬 전용 값으로 바꾼다.

기본 실행은 Postgres와 Redis를 Docker network 내부에만 노출한다. 로컬 호스트에서 DB 클라이언트로 직접 접속해야 할 때만 후속 작업에서 별도 debug profile 절차를 확인한다.

`127.0.0.1:` bind를 `0.0.0.0:`으로 변경 금지. 외부 네트워크 노출 위험.

`infra/.env`와 `packages/api/.env`의 credential은 함께 바꾼다.

| infra/.env | packages/api/.env | 동기화 |
|---|---|---|
| POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DB | DATABASE_URL 안에 같은 값 | 일치 |
| REDIS_PASSWORD | REDIS_URL의 password 부분 | 일치 |

## 시크릿 생성

개발용 placeholder는 실제 배포에 쓰지 않는다. 새 시크릿은 다음처럼 생성한다.

```powershell
openssl rand -hex 32
```

프로덕션은 `.env` 파일 대신 secrets manager 또는 KMS를 사용한다.

## 종료와 volume 처리

```powershell
pnpm db:reset
```

`pnpm db:down`은 volume을 보존하므로 개발 데이터가 남는다. 시크릿 변경 또는 스키마 변경 시 이전 값과 초기화 상태가 남지 않도록 반드시 `pnpm db:reset`을 사용한다.

인증 설정을 바꾼 경우에도 `pnpm db:reset` 후 다시 `pnpm db:up`한다. `POSTGRES_INITDB_ARGS`는 첫 init에만 적용된다.

shell history에 남은 시크릿 정리는 사용자 책임이다.

프로덕션에서는 container/volume 이름을 무작위화하거나 환경별 네임스페이스를 둔다.

## 후속 작업 메모

DevContainer는 P0.4 또는 P0.5에서 별도 task로 처리한다.
WORM 관리자 계정은 P0.3 Prisma 스키마 작업 시 별도 task로 처리한다.
Config 추상화, Redis ACL 또는 *_FILE secrets, tmpfs/resource limit, 운영 container/volume namespace는 후속 phase에서 별도 task로 처리한다.
