# Coesite Security Expert Demo Pack

## 결론

이 패킷은 보안 전문가에게 제출할 controlled demo 기준이다. Coesite는 현재 고객
실데이터 운영이 아니라, 보안 전문가가 제품 정의·API 계약·SDK fail-closed·증거
조회·게이트 체인을 검토할 수 있는 데모 상태로 제출한다.

## 실데이터 금지

- 고객 PII, 운영 secret, production endpoint, 실제 고객 API key를 포함하지 않는다.
- 데모 requestId, subjectRef, resource는 모두 synthetic value만 사용한다.
- 보안 전문가는 demo/staging 또는 로컬 환경에서만 호출한다.
- 데모 key는 제출용으로 분리하고, 회수 가능한 값만 사용한다.

## 보안 전문가에게 보내는 항목

- `README.md`: 제품 요약과 SDK 사용 흐름
- `docs/05-PRODUCT-DEFINITION.md`: Coesite 5W1H, 고객 약속, 제외 범위
- `docs/MVP-LAUNCH-CHECKLIST.md`: paid MVP 런칭 기준과 NO-GO 조건
- `docs/openapi.yaml`: Guard/RedGate API 계약
- `packages/sdk`: TypeScript SDK 소스와 패키지 manifest
- GitHub Actions 최신 성공 run 링크
- `docs/codex-log/`의 최신 gate log

## 데모 전 필수 게이트

```bash
pnpm run gate
pnpm run gate:demo
```

둘 중 하나라도 실패하면 외부 제출은 NO-GO다.

## 데모 시나리오

| 시나리오 | 기대 결과 |
|---|---|
| allowed `read` 요청 | `/v1/guard/verify`가 `PROCEED`와 receipt를 반환 |
| 위험 context 요청 | `/v1/guard/verify`가 `BLOCK`을 반환 |
| missing/invalid customer API key | uniform 403 또는 SDK fail-closed `BLOCK` |
| 잘못된 response verification key | SDK가 `BLOCK`으로 fail-closed |
| RedGate proof 조회 | raw subject/resource/context 없이 hash와 evidence digest만 반환 |
| 고위험 action + 승인 artifact 없음 | `BLOCK` |
| 고위험 action + 서명된 승인 artifact 있음 | 정책상 허용될 때만 `PROCEED` |

## NO-GO

- `pnpm run gate` 실패
- `pnpm run gate:demo` 실패
- GitHub Actions 최신 run 실패
- Security Wall 또는 Secret scan 실패
- Proof view가 raw subject/resource/context를 노출
- SDK가 invalid receipt 또는 invalid response를 `PROCEED`로 해석
- demo/staging secret이 production secret과 공유됨
- 고객 실데이터가 요청/응답/로그/문서에 포함됨

## 제출 판정 문구

보안 전문가에게는 다음 상태로 제출한다.

> Coesite is ready for controlled external security demo review. It is not yet
> authorized for customer real-data production operation. Production launch
> remains blocked until P1 operationalization, customer-specific key policy,
> append-only/WORM storage, and Deep RedTeam closure are complete.

