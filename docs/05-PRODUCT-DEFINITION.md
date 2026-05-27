# Coesite Program Definition

## 결론

Coesite는 AI 실행 시스템 앞단에 붙는 보안 control layer다. 사람의 최종 판단을
대체하지 않고, 요청 단위로 "지금 이 실행을 차단해야 하는가"를 검증하고 증거를
남긴다.

## 5W1H

| 축 | 정의 |
|---|---|
| Why | AI 에이전트와 자동화가 빠르게 실행될수록, 조직에는 실행 전 통제와 실행 후 증거가 필요하다. Coesite는 판단을 대신하지 않고, 정책 위반·증거 누락·검증 실패를 fail-closed로 막아 운영자가 책임 있게 판단하도록 돕는다. |
| Who | 유료 파일럿 기준 고객은 AI 에이전트, 자동 워크플로, 내부 업무 자동화를 운영하는 B2B 팀이다. 1차 사용자는 보안·플랫폼·컴플라이언스 담당자이고, 최종 승인자는 고객 조직의 사람이다. 1차 파일럿 기준 고객은 Facil이다. |
| What | Runtime Seyer `/v1/guard/verify` API, RedGate proof lookup API, TypeScript SDK, ProofBundle, WORM-style evidence reference, P1~P10 원칙 스캔, Security Wall, Secret scan, CI 게이트로 구성된 AI Trust Security Guard다. |
| When | 고객 시스템이 어떤 action을 실행하기 직전, 그리고 운영자가 릴리스·정책 변경·감사 증거를 확인할 때 사용한다. 출시 목표는 2027 Q1이고, 현재 기준은 controlled paid pilot 준비 단계다. |
| Where | 고객 backend, API gateway, agent middleware, 내부 운영 파이프라인, GitHub Actions CI에서 동작한다. 공개 프론트엔드가 최종 판단을 직접 수행하는 구조가 아니다. 증거는 운영 WORM/append-only 저장소에 남긴다. |
| How | Generate -> Verify -> Approve -> Execute 흐름을 유지한다. 호출 시스템은 context를 보내고, Coesite는 TokenNorm, MetaLayer, Turing Boundary, Trust Cube, ProofGate, RedGate 체인을 통과시켜 PROCEED/BLOCK control signal과 검증 가능한 evidence reference를 반환한다. 실패·누락·불일치는 BLOCK으로 처리한다. |

## 고객에게 팔 수 있는 약속

- Coesite는 실행 전에 보안 control signal을 반환한다.
- Coesite는 실행 근거와 증거 reference를 남긴다.
- Coesite는 정책·키·증거·검증 실패를 fail-closed로 처리한다.
- Coesite는 PROCEED를 법적 승인이나 사업 승인으로 포장하지 않는다.
- Coesite는 운영자가 최종 판단을 더 잘 하도록 돕는 증폭 장치다.

## 하지 않는 것

- 사람의 최종 책임 판단을 대체하지 않는다.
- 고객 조직의 법률·사업·채용·금융 판단을 자동 확정하지 않는다.
- 원본 민감 context를 감사 조회 API에 그대로 노출하지 않는다.
- SDK가 서명·receipt·schema가 깨진 응답을 PROCEED로 해석하게 두지 않는다.
- 단일 제품 또는 단일 엔진 결과만으로 허용 신호를 만들지 않는다.

## 사용자 흐름

1. 고객 시스템이 실행하려는 action과 최소 context를 만든다.
2. 고객 시스템이 `/v1/guard/verify`를 호출한다.
3. Coesite가 정책, 호출 주체, action scope, 세션·속도·증거 체인을 검증한다.
4. Coesite가 PROCEED 또는 BLOCK control signal을 반환한다.
5. 고객 시스템은 BLOCK을 fail-closed로 처리한다.
6. 필요한 경우 감사자는 RedGate proof lookup으로 증거 reference를 조회한다.
7. 운영자는 최종 판단과 실행 책임을 가진다.

## 현재 판매 가능 상태

| 항목 | 상태 |
|---|---|
| Core runtime API | 준비됨 |
| SDK fail-closed guard | 준비됨 |
| ProofBundle / evidence reference | 준비됨 |
| RedGate auditor proof lookup | 준비됨 |
| Local full gate | 통과 기록 있음 |
| GitHub Actions CI | 통과 기록 있음 |
| Controlled paid pilot | 조건부 가능 |
| External security expert demo | `pnpm run gate` + `pnpm run gate:demo` + GitHub Actions 성공 시 제출 가능 |
| Production launch | P1 운영화와 장시간 RedTeam 종료 전까지 보류 |

## 런칭 전 고정해야 할 항목

- 고객별 API key 발급·회수 절차
- 고객별 allowed actions와 tenant/action binding
- 운영 WORM/append-only writer 경로
- proof/provenance/audit 보존 기간
- 운영 secret manager 또는 KMS 주입 방식
- shadow mode와 blocking mode 전환 기준
- 장시간 RedTeam/Mythos 결과의 P0/P1 closure 또는 명시 waiver

## 판정 문구

- `PROCEED`: 현재 정책과 게이트 기준에서 차단 신호가 없다는 뜻이다.
- `BLOCK`: 실행을 중단해야 한다는 control signal이다.
- 둘 다 사람의 최종 책임 판단을 대체하지 않는다.
