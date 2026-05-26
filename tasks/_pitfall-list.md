# Codex 작업지시 함정 list (누적·자동 참조)

Codex-Orchestrator는 매 작업지시 작성 시 이 list를 dry-run check. 해당 패턴이 작업 영역과 겹치면 작업지시에 명시 사전 반영.

---

## NestJS lifecycle
- **middleware exception은 ExceptionFilter로 직행** (Interceptor 거치지 않음). padding 로직은 service로 분리·middleware/filter/interceptor 세 경로 모두 호출.
- `APP_INTERCEPTOR`·`APP_FILTER` provider로 글로벌 등록 안 하면 작동 X.
- middleware는 `MiddlewareConsumer`로 등록·routes 명시.

## Postgres
- **BEFORE UPDATE OR DELETE 트리거는 TRUNCATE 못 잡음**. 별도 `BEFORE TRUNCATE FOR EACH STATEMENT` 트리거 필요.
- DDL(`DROP TRIGGER`·`ALTER TABLE DISABLE TRIGGER`)은 owner 권한이면 우회 가능. runtime role 분리 필요.
- `CREATE ROLE`은 cluster-level이라 `prisma migrate reset` 시 재실행 실패. `DO $$ IF NOT EXISTS ... END $$` idempotent 패턴.

## Prisma
- `prisma/migrations/<file>.sql` top-level은 prisma migrate가 안 실행. **반드시 `<TIMESTAMP>_name/migration.sql` 디렉토리 형식**.
- schema.prisma의 `@unique` vs migration SQL의 `UNIQUE`가 불일치하면 drift → `prisma migrate dev`가 reconcile 시도.
- Prisma scripts가 `packages/api/.env` 안 읽음 — `dotenv-cli` wrapper 필수.

## pnpm
- 새 의존성 추가 후 `pnpm install --frozen-lockfile` 깨짐. lock 갱신 후 frozen 검증.
- `.pnpm-store/`·`.pnpm-cache/` untracked 119MB+ 폭증 — `.gitignore`에 사전 추가.
- workspace `@coesite/*` 패키지는 `workspace:*` protocol·tsconfig paths 없이.

## Codex CLI
- **자체 `codex review` sub-process 호출은 401 인증 실패** — Codex-Orchestrator가 독립 dispatch로 별도 호출.
- 백그라운드 호출에 **`< /dev/null` 필수** — 안 붙이면 stdin EOF 대기로 무한 hung.
- `codex review --uncommitted` + custom prompt 동시 불가 (CLI 옵션 충돌). `--title`만 사용.
- `-C <dir>` 명시·`-o <file>` last message 캡처.

## Gemini CLI
- pro 모델(`gemini-3.1-pro-preview`) 한도 비신뢰 — **flash(`gemini-3-flash-preview`) 기본**.
- stdin pipe로 정책 문서·요약본 전달.

## Git
- `git mv`로 이동해야 히스토리 보존. delete+create는 끊김.
- `git check-ignore`로 .gitignore 패턴 검증.
- CLAUDE.md 같은 사본은 drift 자동 검사 CI step 필요.

## 보안 패턴
- TokenNorm fixed-point: NFKC·zero-width·homoglyph·base64·URL 단일 회는 부족. **변화 없을 때까지 루프**(cap·DoS 상한).
- P8 OraclePrevention: timing·size·form 균일화 — **모든 응답**(200·403·404·422·500·middleware exception 등). 외부 403으로 통일.
- EML 시그널: fixed-width hex·sha256(eml + finding + statusCode + pepper + nonce) 마스킹. 같은 finding이라도 nonce로 매번 다름.
- 압축 비활성화 (gzip·deflate). `Content-Encoding: identity`만 허용.
- 헤더 leak: `getHeaderNames` + `removeHeader` 전부 후 uniform set.

## CI
- GitHub Actions: `SHA pinning`·`persist-credentials: false`·branch protection은 GitHub UI에서 별도 설정.
- `scan-principles.sh` SCAN_DIR 기본값이 mono-repo와 안 맞으면 빈 디렉토리 스캔 → 가짜 PASS.

## bash·Windows
- `</dev/null` 등 redirect는 명시.
- Windows에서 `taskkill //F //IM <name>.exe`로 좀비 프로세스 정리.
- bash `set -e` + `set -o pipefail` 명시.

---

# 사이클 누적 학습 패턴

매 사이클 후 새로 발견된 함정을 이 파일에 추가 (Codex-Orchestrator 또는 사용자가 갱신).

---

*Pitfall list v1.0 · 2026-05-22 · 누적 갱신*
