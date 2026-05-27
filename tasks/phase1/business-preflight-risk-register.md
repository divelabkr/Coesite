# Business Preflight Risk Register

**상태:** Draft
**목적:** 사업/파일럿 전 Coesite의 보안·운영·증거·계약 리스크를 P0~P3로 정리한다.
**현재 판정:** **CONDITIONAL GO for controlled pilot readiness / NO-GO for production launch until P1 + Deep RedTeam close**

---

## 0. Executive Summary

사업 전 바로 닫아야 할 P0 5개는 local gate 기준으로 닫혔다.

1. OraclePrevention P1.2-sub2 RED 테스트는 GREEN 전환.
2. `pnpm audit --audit-level moderate`는 0건.
3. WORM hash canonical helper와 tamper regression test 추가.
4. CI에 build/test/audit/prisma/secret/security/principles gate 추가.
5. OpenAPI/shared types/SDK와 fail-closed guard contract 추가.

자동 스캔 결과:

- `bash scripts/security-wall.sh`: PASS
- `SCAN_DIR=. bash scripts/scan-principles.sh`: PASS
- `bash scripts/secret-scan.sh`: PASS
- `pnpm -r exec tsc --noEmit`: PASS
- `pnpm -r build`: PASS
- `TMPDIR=/tmp pnpm test`: PASS, 9 files / 93 tests
- `pnpm audit --audit-level moderate`: PASS, 0 known vulnerabilities
- `prisma validate` with dummy `DATABASE_URL`: PASS
- `docs/openapi.yaml` YAML parse: PASS

주의: `scan-principles.sh` PASS는 P8/P5/P10 완전성을 증명하지 않는다.

---

## 0.1. 2026-05-27 업데이트

- `docs/05-PRODUCT-DEFINITION.md`를 추가해 Coesite 5W1H, 고객 약속, 제외 범위, 사용자 흐름, 현재 판매 가능 상태를 canonical source로 고정했다.
- `README.md`와 `docs/MVP-LAUNCH-CHECKLIST.md`가 제품 정의 문서를 참조하도록 동기화했다.
- `.github/branch-protection.md`의 required checks를 현재 `.github/workflows/ci.yml` job 이름과 맞췄다.
- `pnpm run gate`: PASS. security regressions 66, unit/integration 343, e2e 21, P1~P10, Security Wall, Secret scan, dependency audit, Prisma validate 모두 통과.
- 현재 판정은 유지한다: controlled paid pilot은 조건부 가능, production launch는 P1 운영화와 장시간 RedTeam 종료 전까지 보류.

---

## 0.2. 2026-05-27 demo-readiness 업데이트

- `scripts/demo-readiness.sh`와 `pnpm run gate:demo`를 추가했다.
- `pnpm run gate`는 12단계로 확장되어 마지막에 security expert demo readiness를 실행한다.
- GitHub Actions에 `demo-readiness` job을 추가했고, `.github/branch-protection.md` required checks에도 반영했다.
- `docs/SECURITY-EXPERT-DEMO-PACK.md`를 추가해 실데이터 금지, 제출 항목, 데모 시나리오, NO-GO 조건을 고정했다.
- 검증: `pnpm run gate:demo` PASS, `pnpm run gate` PASS, `SCAN_DIR=. bash scripts/scan-principles.sh` PASS.
- 판정: 보안 전문가 controlled demo 제출은 GO 가능. 고객 실데이터 production 운영은 기존대로 P1 운영화와 Deep RedTeam 종료 전까지 NO-GO.

---

## 1. P0 — 사업 전 차단

### P0-1. OraclePrevention 외부 관찰 oracle

근거:
- `packages/api/src/common/oracle-prevention/oracle-prevention.service.ts:17`
- `packages/api/src/common/oracle-prevention/oracle-prevention.service.ts:44`
- `packages/api/src/common/oracle-prevention/oracle-prevention.service.ts:72`
- `packages/api/src/common/oracle-prevention/size-padding.util.ts:19`
- `docs/codex-log/2026-05-26-0744-p1.2-sub2-regression-red.md`

상태:
- **Closed local-gate 기준.**

닫은 조치:
- P1.2-sub2 E1~E6 구현.
- RED 테스트 GREEN 전환.
- request clock middleware 추가.
- Express 5 `req.query` getter-only 회귀 수정.

### P0-2. dependency audit high 취약점

근거:
- `packages/api/package.json:16`
- `packages/api/package.json:18`
- `package.json:26`
- `pnpm-lock.yaml`
- `pnpm audit --audit-level moderate`

현재 audit 결과:
- **Closed local-gate 기준.**
- high 0
- moderate 0
- low 0

대표 항목:
- `multer` DoS 계열 transitive 취약점.
- `path-to-regexp` ReDoS.
- Nest 관련 advisory.
- `qs`, `vite`, `esbuild` dev/tooling 취약점.

닫은 조치:
- Nest 11.1.18로 업데이트.
- Vitest 4.1.7, Vite 8.0.14, @types/node 22.19.19로 업데이트.
- `pnpm audit --audit-level moderate` CI gate 추가.

### P0-3. WORM hash canonical binding 미구현

근거:
- `prisma/migrations/20260522000005_hash_recompute_intent/migration.sql:14`
- `prisma/schema.prisma:76`
- `prisma/schema.prisma:112`
- `prisma/schema.prisma:130`
- `prisma/schema.prisma:149`

상태:
- **Closed service-layer 기준.**
- DB trigger는 hash format, duplicate, prevHash 존재를 확인한다.
- service-layer canonical helper가 table/partition/prevHash/createdAt/fields를 hash에 묶는다.

닫은 조치:
- `packages/utils/src/worm-canonical.ts` canonical digest helper 구현.
- 위조 payload 회귀 테스트 추가.
- `scripts/scan-principles.sh`에서 direct WORM create를 P5 위반으로 차단.
- RedTeam P0 후속으로 `__proto__`, `constructor`, `prototype` 특수 key binding 회귀 테스트 추가.

잔여 리스크:
- DB trigger 자체가 digest를 재계산하는 단계는 아직 아니다. 현재는 service-layer + scan gate 기준으로 닫았다.
- Deep RedTeam은 PARTIAL이므로 production launch 전 재실행 필요.

### P0-4. CI 보안 게이트 공백

근거:
- `.github/workflows/ci.yml:43`
- `.github/workflows/ci.yml:61`
- `.github/workflows/ci.yml:84`
- `package.json:9`
- `package.json:10`

상태:
- **Closed local-gate 기준.**
- CI는 build, test, dependency audit, prisma validate, secret scan, security-wall, `SCAN_DIR=.` principles scan을 강제한다.

잔여 리스크:
- coverage 80% threshold는 아직 package script로 강제하지 않았다. P1 beta 전 P1로 남긴다.

### P0-5. 외부 계약 부재

근거:
- `docs/openapi.yaml` 없음.
- `packages/types/src/index.ts:1`
- `packages/sdk/src/index.ts:1`

상태:
- **Closed skeleton 기준.**
- `docs/openapi.yaml` 추가.
- `packages/types/src/index.ts` 최소 guard contract 추가.
- `packages/sdk/src/index.ts` fail-closed client 추가.
- `packages/api/src/contracts/guard.controller.ts`는 Phase 1에서 항상 `BLOCK`을 반환한다.

잔여 리스크:
- 실제 `PROCEED` control은 P10 ConsensusGate 구현 전까지 금지한다.

---

## 2. P1 — 베타 전 차단

### P1-1. runtime DB role 활성 검증 부재

근거:
- `prisma/migrations/20260522000003_role_separation/migration.sql:1`
- `prisma/migrations/20260522000003_role_separation/migration.sql:7`
- `prisma/schema.prisma:7`
- `packages/api/.env.example:5`

상태:
- `coesite_runtime`은 `LOGIN PASSWORD NULL`로 생성된다.
- 앱 datasource는 `DATABASE_URL` 단일 값이다.
- 실제 runtime이 owner가 아닌 runtime role로 붙는지 자동 검증이 없다.

필수 조치:
- owner migration URL과 runtime app URL을 분리 강제.
- runtime role으로 WORM UPDATE/DELETE 거부, INSERT/SELECT 범위 검증.
- owner URL이 runtime에서 사용되면 fail-fast.

### P1-2. WORM payload redaction/encryption backlog

근거:
- `prisma/schema.prisma:76`
- `prisma/schema.prisma:93`
- `prisma/schema.prisma:112`
- `prisma/schema.prisma:130`
- `prisma/schema.prisma:149`

상태:
- payload fields는 Json/String 평문이다.
- redaction/encryption은 주석 backlog다.

필수 조치:
- WORM payload classification.
- digest-only default.
- secret/raw prompt/personal data deny tests.

### P1-3. main bootstrap hardening 부족

근거:
- `packages/api/src/main.ts:9`
- `packages/api/src/main.ts:11`

상태:
- x-powered-by disable만 있다.
- body size limit, CORS policy, trust proxy, graceful shutdown, host binding policy가 명시되지 않았다.

필수 조치:
- JSON/body size limit.
- strict CORS default deny.
- consistent host/port env validation.
- graceful shutdown.

### P1-4. Security Wall scan 결과 불일치 관리

근거:
- `scripts/security-wall.sh:256`
- RedTeam-B reported critical hits, but local `security-wall.sh` returned PASS.

상태:
- 자동 scan은 PASS.
- RedTeam-B는 과거 workorder/log 기반 critical hit 가능성을 주장했다.
- 금지어 재노출 방지를 위해 본 장부에는 키워드를 기록하지 않는다.

필수 조치:
- RedTeam-B 주장과 현재 scanner 결과를 별도 read-only 재현 절차로 검증.
- scanner 대상/allowlist/exclude 정책 문서화.
- critical claim은 자동 scanner 출력으로만 확정.

---

## 3. P2 — 운영 안정화

- `security-wall.sh`는 MED hit 시 `tasks/security-wall.log`에 쓴다. read-only 검증 모드와 CI 재현성을 위해 `--no-write` 옵션이 필요하다.
  - 근거: `scripts/security-wall.sh:229`
- `pnpm test`는 Windows temp 경로 문제로 실패 가능하다. `TMPDIR=/tmp` 또는 CI 전용 env를 script에 고정해야 한다.
  - 근거: `docs/codex-log/2026-05-26-0710-platform-preflight-prep.md`
- sandbox 내부 E2E는 `listen EPERM`으로 실패한다. sandbox 밖 승인 실행 결과를 분리 기록해야 한다.
  - 근거: `packages/api/test/e2e/app-module-runtime.e2e.test.ts:93`
  - 근거: `packages/api/test/e2e/oracle-prevention.e2e.test.ts:41`

---

## 4. P3 — 제품 완성도

- README/30분 통합 가이드가 아직 실제 고객용 수준은 아니다.
- Phase 2/3 모듈은 아직 구현 전이다.
- Phase 5 S3 Object Lock 전에는 "완전 WORM"이라고 표현하지 않는다.
- P9/P10은 `scan-principles`에서 N/A로 통과 중이다.

---

## 5. 권장 작업 순서

1. P1.2-sub2 OraclePrevention RED -> GREEN.
2. dependency audit high 제거.
3. CI fast/e2e/audit/coverage/secret gate 분리.
4. WORM canonical hash binding + insert helper.
5. runtime role 실제 DB 검증.
6. OpenAPI/types/SDK skeleton.
7. Security Wall read-only 재검증 모드.
8. main bootstrap hardening.

---

## 6. 사람 승인 기준

사업 준비 GO는 아래가 모두 충족될 때만 가능하다.

- P0 전부 closed.
- P1에 owner가 명시 승인한 waiver가 없으면 closed.
- `pnpm audit --audit-level moderate` 정책 PASS 또는 documented waiver.
- OpenAPI/types/SDK 최소 skeleton 존재.
- CI가 최소 fast/e2e/security/audit를 강제.
- runtime/platform Deep RedTeam 재검토에서 P0 없음. timeout/PARTIAL만 있으면 사람 waiver 필요.
