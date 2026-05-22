# P0.x MYTHOS DOOM Phase B follow-up

## 무엇을 했나

P0.x MYTHOS 신탁 22건 중 DOOM 5건에 대해 Phase B 범위에서 가능한 변경을 적용했다.

- D1: owner/runtime DB URL을 분리했다. `DATABASE_URL_OWNER`는 Prisma migration/reset용, `DATABASE_URL` 또는 `RUNTIME_DATABASE_URL`은 runtime용으로 문서화했다.
- D2: hash 재계산 자체는 Phase 1 application layer로 남기고, P0.x에서는 `hash <> prevHash`, 64자 lowercase hex 재검증, Phase 1 TODO 주석을 migration에 추가했다.
- D3: WORM payload/message의 PII 통제 주석을 `classify -> redact/encrypt -> digest metadata -> approve` 절차로 강화했다.
- D4: stale `AuditLog_hash_idx` 제거 migration을 추가했다.
- D5: Docker 설치는 별도 의사결정 트랙으로 두고 README 사전 요구사항에 Docker Desktop 수동 설치 및 WSL2 Docker Engine/Podman 대안을 추가했다.

## 왜

MYTHOS 메타 검토에서 DOOM 5, DOUBT 3, ORACLE 4, HERESY 5, VIRTUE 5, 총 22건이 발견됐다. 이번 작업은 P0.x 단독으로 처리 가능한 schema/env/migration/documentation 변경만 수행하고, application layer 또는 Docker host 의존 작업은 backlog로 명시하는 것이 목적이었다.

## 변경 파일

- `prisma/migrations/20260522000004_drop_stale_audit_index/migration.sql`
  - `DROP INDEX IF EXISTS "AuditLog_hash_idx";` 추가.
- `prisma/migrations/20260522000005_hash_recompute_intent/migration.sql`
  - 5개 WORM 테이블에 `hash <> prevHash` CHECK 추가.
  - `verify_chain_insert()`에 64자 lowercase hex 재검증, `hash = prevHash` 차단, Phase 1 canonical digest TODO 주석 추가.
- `prisma/schema.prisma`
  - 4개 payload와 `WormLog.message`에 PII 통제 절차 주석 강화.
- `infra/.env.example`
  - `DATABASE_URL_OWNER`, owner `DATABASE_URL`, `RUNTIME_DATABASE_URL` 분리 명시.
- `packages/api/.env.example`
  - `DATABASE_URL_OWNER`는 migration/reset, `DATABASE_URL`은 runtime으로 분리.
- `package.json`
  - `db:up:runtime` 스크립트 추가.
  - `prisma:migrate`, `prisma:reset`이 `DATABASE_URL_OWNER`를 `DATABASE_URL`로 주입해 owner URL을 사용하도록 변경.
- `README.md`
  - 사전 요구사항에 Docker Desktop 수동 설치와 WSL2 Docker Engine/Podman 대안 추가.
  - local DB env 동기화 표를 owner/runtime 분리 기준으로 수정.
  - Prisma migration/reset은 owner URL, 앱 실행은 runtime URL 사용을 명시.
- `docs/codex-log/2026-05-22-mythos-doom-followup.md`
  - 본 요약본 작성.

## 검증 결과

1. `pnpm exec prisma validate --schema=prisma/schema.prisma`
   - PASS. `DATABASE_URL`은 PowerShell 세션에만 임시 주입했다.
2. `pnpm exec prisma format --schema=prisma/schema.prisma`
   - PASS.
3. `Select-String -Path "prisma/migrations/*/migration.sql" -Pattern "drop_stale_audit_index","hash_recompute_intent","TODO[Phase 1+]" -SimpleMatch`
   - PASS. migration 2개와 Phase 1 TODO 주석 검출.
4. `Select-String -Path "infra/.env.example","packages/api/.env.example" -Pattern "DATABASE_URL_OWNER","RUNTIME_DATABASE_URL" -SimpleMatch`
   - PASS. owner/runtime URL 분리 검출.
5. `pnpm -r build` 및 `pnpm test`
   - PASS. workspace build 성공, Vitest 1개 테스트 PASS.
6. 금지 키워드 정적 스캔
   - PASS. 수정 대상 파일 기준 0건.

Docker compose, psql, redis ping 실검증은 실행하지 않았다. 워크오더상 Docker 설치와 runtime DB 검증은 별도 트랙이다.

## 리스크 / 미해결

### DOOM 처리와 한계

- DOOM 1: runtime role 앱 경로 미연결
  - 처리: env와 README, Prisma owner migration/reset script를 분리했다.
  - 한계: Prisma Client가 실제로 runtime datasource만 쓰도록 하는 application layer 변경은 Phase 1 backlog.
- DOOM 2: hash가 canonical payload digest인지 미검증
  - 처리: DB trigger/check에서 hash 형식과 `hash != prevHash`만 강화했다.
  - 한계: canonical payload encoding 및 sha256 재계산은 Phase 1 backlog.
- DOOM 3: WORM payload/message 평문 PII 위험
  - 처리: schema 주석을 절차형 통제 기준으로 강화했다.
  - 한계: `packages/api/src/audit/encrypt.ts`, INSERT 전 digest/envelope 처리, redaction policy는 Phase 1 backlog.
- DOOM 4: schema drift migration 부재
  - 처리: stale audit hash index 제거 migration 추가. P0.x 범위에서 완료.
- DOOM 5: DB/Docker/runtime 검증 반복 NOT_RUN
  - 처리: Docker 설치 가이드와 별도 재검증 트랙을 README에 추가했다.
  - 한계: Docker host 설치와 compose/psql/redis 실검증은 사람 결정 후 별도 호출 필요.

### DOUBT backlog

- P0는 제품 동작의 단단함이 아니라 미래 보안 구조의 자리만 만든 상태다.
- 게이트 수보다 실제 증명력이 중요하며, WORM/role/trigger/compose 핵심 명제는 아직 실험되지 않았다.
- 자체 codex review는 이번 지시상 호출하지 않았다. 다중 검토 완료로 포장하지 않는다.

### ORACLE backlog

- Security Wall 스캔은 기준 문서를 제외하는 정책이 필요하다.
- `DATABASE_URL`과 `RUNTIME_DATABASE_URL` 분리는 이름 분리일 뿐, Phase 1 전까지 실제 앱 운명 분리는 미완성이다.
- `GENESIS`는 전역 시작 블록이 아니라 scope별 sentinel로 쓰인다. 문서/구현 용어 정합이 필요하다.
- README의 credential 동기화 규칙은 아직 preflight 실행 검증으로 승격되지 않았다.

### HERESY backlog

- P3의 S3 Object Lock 7년 이중 WORM은 아직 없다.
- P5의 ConsensusGate 연동 체인 단절 대응은 아직 없다.
- P8/P9/P10의 OraclePrevention, TrustMetabolism cron, 3엔진 consensus 구현은 아직 없다.
- P6 결합의존은 package dependency 수준이며 강제 import/build 실패 게이트는 아직 없다.
- 실제 runtime 앱이 WORM 기록을 쓰는 경로가 없다.

### VIRTUE backlog / 보존 항목

- 판단형 AI 로직과 승인/거부 결정 필드 오염이 보이지 않는 상태를 유지한다.
- TRUNCATE 차단, scope-aware prevHash unique, schema-qualified dynamic SQL 방향을 유지한다.
- preflight의 placeholder secret, `0.0.0.0`, 빈 password 차단을 유지한다.
- 실패와 NOT_RUN을 숨기지 않는 로그 기준을 유지한다.
- 현재 골격을 신뢰 프로토콜로 포장하지 않고, 증명 전 상태로 기록한다.
