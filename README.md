# Coesite

Coesite MVP는 Runtime Seyer 기반 AI Trust Security Guard다. 고객 시스템은
`/v1/guard/verify`에 요청 단위 context를 보내고, Coesite는 사람의 최종 책임
판단을 대체하지 않는 control signal을 반환한다.

현재 MVP API는 다음을 실제 연결해 평가한다.

- TokenNorm + OraclePrevention
- MetaLayer AllowList/GTED + SemanticFirewall + SIREN
- Turing Boundary fingerprint/provenance/velocity/session budget
- Trust Cube ComplyGate + TrustMetabolism + ConsensusGate
- ProofGate ReleaseContract + ProofBundle append-only evidence
- RedGate auditor proof lookup without raw context exposure
- WORM-style trace/evidence reference

## 프로그램 정의

- Coesite 5W1H와 판매 가능 범위: [`docs/05-PRODUCT-DEFINITION.md`](docs/05-PRODUCT-DEFINITION.md)
- Paid MVP 런칭 기준: [`docs/MVP-LAUNCH-CHECKLIST.md`](docs/MVP-LAUNCH-CHECKLIST.md)

## 유료 MVP 사용 흐름

```ts
import { CoesiteClient } from "@coesite/sdk";

const client = new CoesiteClient({
  baseUrl: "https://api.example.com",
  apiKey: process.env.COESITE_API_KEY,
  responseVerificationKey: process.env.COESITE_RESPONSE_VERIFICATION_KEY,
  auditKey: process.env.COESITE_REDGATE_AUDIT_KEY,
});

const result = await client.verifyGuard({
  action: "read",
  requestId: "req-1",
  resource: "doc-1",
  subjectRef: "agent-1",
});

if (result.control === "BLOCK") {
  throw new Error("Coesite guard blocked this request");
}

const proof = await client.getProofBundle("req-1");
console.log(proof?.hash);
```

`PROCEED`는 실행 허가가 아니라, 현재 정책과 게이트 기준에서 차단 신호가 없다는
뜻이다. 사람의 승인, 사업 판단, 법적 책임은 호출 시스템과 운영자에게 남는다.

## MVP 운영 환경 변수

```powershell
COESITE_POLICY_HMAC_KEY=<openssl rand -hex 32>
COESITE_RESPONSE_HMAC_KEY=<openssl rand -hex 32>
COESITE_API_KEYS=<customer key 1>,<customer key 2>
COESITE_REDGATE_AUDIT_KEYS=<auditor key 1>,<auditor key 2>
COESITE_ALLOWED_ACTIONS=read
COESITE_PROOF_BUNDLE_APPEND_PATH=/secure/worm/proof-bundle.jsonl
```

`COESITE_POLICY_HMAC_KEY`, `COESITE_RESPONSE_HMAC_KEY`, `COESITE_API_KEYS`,
`COESITE_REDGATE_AUDIT_KEYS`, `COESITE_WORM_APPEND_PATH`,
`COESITE_PROVENANCE_APPEND_PATH`, `COESITE_PROOF_BUNDLE_APPEND_PATH`는 로컬 개발에서만
기본값 또는 미설정으로 동작한다. `NODE_ENV=production`, `NODE_ENV=staging`,
`COESITE_ENV=production`, `COESITE_ENV=staging`에서는 누락 시 앱이 시작되지
않는다.
프로덕션에서는 반드시 KMS 또는 secret manager로 주입한다.

## MVP 게이트 확인

```powershell
pnpm -r build
pnpm -r exec tsc --noEmit
TMPDIR=/tmp pnpm test
SCAN_DIR=. bash scripts/scan-principles.sh
bash scripts/security-wall.sh
bash scripts/secret-scan.sh
pnpm audit --audit-level moderate
```

현재 MVP는 core/runtime 연결 제품이다. 유료 파일럿 판매 전에는 고객별 허용 action,
보존 정책, WORM 저장소, API 키 발급·회수 절차를 계약서와 함께 고정한다.

## 사전 요구사항

- Node 22 (`.nvmrc` 기준)
- pnpm 10 (`package.json`의 `packageManager` 기준)
- Docker 및 Docker Compose 플러그인: 로컬 Postgres/Redis가 필요할 때만 사용
- Docker Desktop은 수동 설치 후 실행 상태에서 검증한다. 대안은 WSL2 Docker Engine 또는 Podman을 별도 트랙에서 선택한다.

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
4. `packages/api/.env` 값 교체: `OWNER_DATABASE_URL`, `RUNTIME_DATABASE_URL`, `REDIS_URL`의 password를 `infra/.env`와 동기화하고, `JWT_SECRET`을 `openssl rand -hex 32` 결과로 교체한다.
5. `pnpm db:up` # preflight 자동 실행 -> docker compose up

`postgres`와 `redis` 서비스 상태가 `healthy`인지 확인한다.

Redis는 개발 환경에서도 `REDIS_PASSWORD` 인증을 요구한다. `infra/.env`를 만들면 기본 placeholder를 로컬 전용 값으로 바꾼다.

기본 실행은 Postgres와 Redis를 Docker network 내부에만 노출한다. 로컬 호스트에서 DB 클라이언트로 직접 접속해야 할 때만 후속 작업에서 별도 debug profile 절차를 확인한다.

`127.0.0.1:` bind를 `0.0.0.0:`으로 변경 금지. 외부 네트워크 노출 위험.

`infra/.env`와 `packages/api/.env`의 credential은 함께 바꾼다.

| infra/.env | packages/api/.env | 동기화 |
|---|---|---|
| POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DB 또는 OWNER_DATABASE_URL | OWNER_DATABASE_URL 안에 같은 owner 값 | 일치 |
| RUNTIME_DATABASE_URL | RUNTIME_DATABASE_URL 안에 같은 runtime 값 | 일치 |
| REDIS_PASSWORD | REDIS_URL의 password 부분 | 일치 |

## Phase 1 이전 runtime role 사용 가이드

현재 coesite_runtime은 PASSWORD NULL로 비활성 상태입니다.

- Phase 1 application 완성 전: DATABASE_URL=$OWNER_DATABASE_URL 사용
- Phase 1 진입 후 활성화 절차:
  1. ALTER ROLE coesite_runtime PASSWORD :secret_from_kms;
  2. .env의 RUNTIME_DATABASE_URL을 실제 값으로 교체
  3. Prisma client multi-datasource 구성 (별도 task)

## 시크릿 생성

개발용 placeholder는 실제 배포에 쓰지 않는다. 새 시크릿은 다음처럼 생성한다.

```powershell
openssl rand -hex 32
```

프로덕션은 `.env` 파일 대신 secrets manager 또는 KMS를 사용한다.

## Phase 1 진입 전 결정 필요

WORM 계열 테이블의 `payload`에는 평문 PII를 저장하지 않는다. Phase 1 이전에 envelope encryption 또는 redaction 정책을 확정하고, 최소 필드는 digest hash, timestamp, actorId 중심으로 제한한다.

`coesite_runtime` DB role의 비밀번호는 migration placeholder를 운영 값으로 쓰지 않는다. 실제 운영에서는 KMS 또는 `*_FILE` 기반 secret 주입 방식을 확정한 뒤 `RUNTIME_DATABASE_URL`을 앱 runtime 전용으로 분리한다.

Prisma migration/reset은 owner URL(`OWNER_DATABASE_URL`)만 사용한다. 앱 실행은 runtime URL(`RUNTIME_DATABASE_URL`)을 사용해야 하며, Prisma Client의 실제 runtime role 연결은 Phase 1에서 application layer 변경으로 완료한다.

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
Docker 설치 후 `docker compose config`, `docker compose up`, `psql`, `redis ping`, `docker compose down -v` 재검증은 별도 호출로 처리한다.
GitHub Actions SHA pinning은 Dependabot 또는 Renovate 관리 체계 확정 후 별도 task로 처리한다. 현재는 `actions/*@v4`를 유지한다.
