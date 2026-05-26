# Business Preflight Risk Register

## 무엇을 했나

결론: **사업/파일럿 전 현재 상태는 NO-GO**다.
P1.2-sub2 런타임 취약점 외에도 dependency audit, WORM canonical hash, CI 보안 게이트, OpenAPI/types/SDK 공백이 추가로 확인됐다.

## 왜

사용자가 "클로드 코드 때 취약점이 엄청 나왔다"고 지적했고, 현재도 P1.2-sub2 외부 관찰 취약점만이 전부가 아니었다. 사업을 시작하려면 코드 동작뿐 아니라 보안 게이트, 증거 무결성, 운영 재현성, 외부 계약이 같이 닫혀야 한다.

## 변경 파일

- 추가:
  - `tasks/phase1/business-preflight-risk-register.md`
  - `docs/codex-log/2026-05-26-0818-business-preflight-risk-register.md`
- 코드 수정:
  - 없음

## 검증 결과

- `bash scripts/security-wall.sh`: PASS
- `bash scripts/scan-principles.sh`: PASS
- `pnpm -r exec tsc --noEmit`: PASS
- `pnpm -r build`: PASS
- `pnpm exec prisma validate --schema=prisma/schema.prisma`: FAIL
  - 사유: `DATABASE_URL` 미설정
- `DATABASE_URL=postgresql://user:pass@localhost:5432/coesite pnpm exec prisma validate --schema=prisma/schema.prisma`: PASS
- `pnpm audit --audit-level moderate`: FAIL
  - 11 vulnerabilities
  - high 4, moderate 6, low 1

## RedTeam 결과

- RedTeam-A(runtime attack surface): timeout/shutdown. 최종 판단에는 반영하지 않음.
- RedTeam-B(platform/data/ops): NO-GO.
  - dependency high 취약점
  - WORM hash canonical binding 미구현
  - CI coverage/e2e/audit/secret gate 공백
  - runtime role 검증 부재
  - OpenAPI/types/SDK 공백

주의:
- RedTeam-B는 Security Wall critical hit 가능성을 언급했으나, 로컬 `scripts/security-wall.sh`는 PASS였다.
- 금지어 재노출 방지를 위해 해당 키워드는 로그에 쓰지 않는다.
- 이 항목은 "scanner 결과와 RedTeam 주장 불일치"로 별도 재검증 대상이다.

## P0 요약

1. OraclePrevention P1.2-sub2 RED 테스트가 실패 중.
2. dependency audit high 취약점 4건.
3. WORM hash가 payload canonical digest와 묶이지 않음.
4. CI가 e2e/coverage/dependency audit/secret scan을 강제하지 않음.
5. OpenAPI/shared types/SDK가 공백.

## 리스크 / 미해결

- P1.2-sub2 구현 전이라 RED 테스트는 의도적으로 실패 중이다.
- dependency update는 package/lockfile 변경이 필요하므로 별도 작업으로 분리해야 한다.
- WORM canonical hash binding은 DB trigger/service helper/test가 함께 필요하다.
- CI gate 보강은 현재 RED 테스트와 충돌할 수 있어 fast/e2e/heavy 분리가 선행되어야 한다.
- runtime role 검증은 실제 DB 또는 docker compose가 필요하다.

## 다음 액션

권장 순서:

1. P1.2-sub2 OraclePrevention RED -> GREEN.
2. dependency audit high 제거.
3. CI fast/e2e/audit/coverage/secret gate 분리.
4. WORM canonical hash binding + insert helper.
5. runtime role 실제 DB 검증.
6. OpenAPI/types/SDK skeleton.
7. Security Wall read-only 재검증 모드.
8. main bootstrap hardening.
