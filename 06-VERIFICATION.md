# 06-VERIFICATION.md — Phase 게이트 + AUTO-DEBUG + 완료 기준
**Coesite MVP P0 · 검증 프로토콜**

---

## 0. 3-게이트 원칙 (모든 Phase 종료 시 필수)

```
┌──────────────────────────────────────────┐
│  Gate 1: TypeScript                       │
│    npx tsc --noEmit                       │
│    →  0 오류 필수                          │
├──────────────────────────────────────────┤
│  Gate 2: Vitest                           │
│    npx vitest run                         │
│    →  100% 통과 + 커버리지 80%+           │
├──────────────────────────────────────────┤
│  Gate 3: Principles Scan                  │
│    bash scripts/scan-principles.sh        │
│    →  P1~P10 0 위반                       │
├──────────────────────────────────────────┤
│  Gate 4: Security Wall (항상 실행)        │
│    bash scripts/security-wall.sh          │
│    →  Mountain 0건                        │
└──────────────────────────────────────────┘

4-게이트 통과 없이 다음 Phase 진입 절대 금지.
```

---

## 1. Phase별 추가 검증 항목

### Phase 0 — Foundation

```
□ pnpm install 성공
□ pnpm -r build 성공
□ docker compose up -d 모든 서비스 healthy
□ Postgres 접속 + 마이그레이션 적용 확인
□ Redis ping 응답 (PONG)
□ Prisma generate 성공
□ WORM 트리거 동작 확인 (수동 UPDATE 시도 → 거부)
□ CLAUDE.md 루트 배치
□ .claude/agents/ 8개 파일 존재
□ CI 워크플로우 등록 + 실행 통과
□ scan-principles.sh 실행 가능 (chmod +x)
□ security-wall.sh 실행 가능
```

### Phase 1 — META-LAYER 3.0

```
□ TokenNorm 미들웨어 활성화
□ OraclePrevention 인터셉터 활성화 (응답 시간 stddev < 5ms)
□ M-1 AllowList 캐시 정상 (Redis 5분 TTL)
□ GTED 거리 계산 정확성 (벤치마크)
□ SemanticFirewall 룰 매칭 (OWASP LLM Top 10 8/10 차단)
□ MirrorModel 활성화
□ SIREN 3.0:
  □ Polyintent 의도 분산도 측정
  □ DeceptionGate 디코이 응답 생성
  □ 디코이에 워터마크(제로폭 문자) 삽입 확인
  □ 핑백 URL 임베드 확인
  □ Honeypot 엔드포인트 자동 생성 (의심 패턴별)
  □ 허니팟 접근 시 AttestationChain 기록
□ MetaLayerGuard 통합 (4 단계 chain)
□ E2E 5 시나리오 통과
□ Vitest 100+ 케이스
```

### Phase 2 — Turing Boundary

```
□ TB-1 CognitiveFingerprint:
  □ 지문 충돌률 < 0.01%
  □ baseline 등록 흐름
□ TB-2 ProvenanceChain:
  □ prevHash 체인 검증
  □ genesis 블록 하드코딩 상수
  □ 체인 단절 → ConsensusGate 자동 호출
  □ SecurityDNA 메타 포함
□ TB-3 VelocityThrottle:
  □ 4개 윈도우 (10s/1m/5m/1h) 정확
  □ 점진적 강등 (warn→throttle→deny)
□ TB-3 SessionBudget:
  □ Redis atomic 카운터
  □ 소진 시 HumanGate 자동
□ TB-4 ShadowMode:
  □ 의심 세션 격리 (실제 DB 변경 X)
  □ 외부 호출 차단
□ TB-5 HumanGate (P4 강제):
  □ ★ toolCall 목록에서 제외 확인 (자동 스캔)
  □ 별도 도메인/포트 분리
  □ 별도 KMS 키링
  □ BioAuth 활성화
  □ PeerVerify (2명 동시) 필수
  □ ApprovalFatigue 탐지
  □ 다중 알림 채널 (SMS+Email+Push)
□ Vitest 200+ 누적
```

### Phase 3 — Trust Cube Core

```
□ L0 MultiRoot:
  □ AWS KMS 어댑터
  □ GCP KMS 어댑터
  □ Azure Key Vault 어댑터
  □ 로컬 stub 어댑터
  □ 2-of-3 합의 (1개 장애 허용 / 2개 장애 차단)
  □ SPIFFE X.509 SVID
□ L1 ComplyGate:
  □ 정책 엔진 (룰 기반, P1 준수)
  □ HMAC 서명 검증
  □ DualSign (2개 서명자)
  □ FPV 검증
  □ C-2 DMS:
    □ Dry-Run 모드
    □ 트리거 조건 4가지
    □ DmsTriggerLog WORM 기록
    □ 외부 감사관 자동 알림
  □ IncidentGovernor 4단계 강등
□ L2 Seyer Gate Chain 10단계:
  □ Step 1~10 순서 실행
  □ 각 Step 단위 테스트
  □ Chain 전체 E2E
□ TrustMetabolism:
  □ 5분 cron 동작
  □ sigmoid 비선형 곡선 (4%/h → 1%/h)
  □ 활동 시 baseline 갱신
□ ConsensusGate (P10 강제):
  □ 3엔진 동시 평가
  □ 2-of-3 합의 필수
  □ 1엔진 장애 시 fail-closed
  □ 응답 시간 균일화 (P8)
□ Vitest 350+ 누적
```

### Phase 4 — ProofGate L3

```
□ PreviewEngine:
  □ 원본 즉시 공개 차단
  □ 합성/마스킹 미리보기 생성
  □ preview→명시요청→원본 흐름
□ ReleaseContract:
  □ 모든 공개 요청 필수
  □ 4 필드 (목적/범위/만료/워터마크)
  □ HMAC 서명 검증
□ PreviewBudget:
  □ 다중 사용자 누적 면적
  □ 면적 초과 → HumanGate 승격
  □ 재조합 시뮬레이션 차단
□ ApprovalFatigueDetector:
  □ 연속 승인 패턴
  □ PeerVerify 강제
□ ProofBundle:
  □ 모든 공개 = Bundle
  □ contract + chain + 승인 + 서명
  □ WORM 저장 (P3)
□ ZKBP:
  □ Zero-Knowledge Bundle Proof
  □ 외부 검증 가능
□ OutOfBandLog:
  □ 메인 DB 분리
  □ 별도 KMS 키
□ Heartbeat:
  □ 1분 cron
  □ 중단 시 DMS 트리거
□ MetadataGuard:
  □ 권한별 필드 마스킹
□ Vitest 450+ 누적
```

### Phase 5 — RedGate + WORM 이중

```
□ Postgres 트리거:
  □ 5개 WORM 테이블 모두 UPDATE/DELETE 차단
  □ TRUNCATE 차단
  □ 100건 위반 시도 → 100건 차단
□ S3 Object Lock:
  □ COMPLIANCE 모드 (Governance 아님)
  □ Retention 7년 설정
  □ Versioning 활성화
  □ Terraform 모듈 적용
□ WORM Sync Cron:
  □ 매 시간 Postgres → S3
  □ 해시 무결성 100%
  □ 실패 시 알림
□ RestoreService:
  □ 감사 키 인증 필수
  □ Read-only 보장
□ RedGate API:
  □ Read-only
  □ 감사 키 발급 흐름 (HumanGate 승인)
  □ AuditQueryDsl 동작
□ Vitest 500+ 누적
```

### Phase 6 — 통합 + SDK + E2E

```
□ E2E 5 시나리오:
  □ 정상 흐름 → ProofBundle 생성
  □ 공격 흐름 → META 거부 + AuditLog
  □ 사고 모드 → DMS + 4단계 강등
  □ 공모 시도 → PreviewBudget 초과 + HumanGate
  □ 회복 흐름 → 1엔진 장애 + 2-of-3 통과
□ Grok adversarial 11종:
  □ 모두 차단 (성공률 < 0.01%)
  □ 결과 리포트 생성
□ SDK (@divelab/coesite-guards):
  □ 3 프리셋 (@public/@standard/@sensitive)
  □ 데코레이터 기반
  □ 로컬+원격 모드 전환
  □ 외부 프로젝트 통합 테스트
□ OpenAPI 3.1:
  □ 전체 엔드포인트 명세
  □ Validator 통과
  □ Swagger UI 동작
□ README:
  □ 30분 통합 가이드
  □ 트러블슈팅
□ Vitest 550+ 누적
```

### Phase 7 — Buffer (선택)

```
□ 외부 침투 테스트:
  □ OWASP LLM Top 10 전체 통과
  □ OWASP Web Top 10 전체 통과
  □ TruffleHog 시크릿 스캔 0건
□ Opus 4.7 peer review:
  □ Critical 0건
  □ High 모두 해결 또는 명시적 acceptance
  □ Medium 80% 이상 해결
□ SECURITY-AUDIT-REPORT.md:
  □ E2E 결과
  □ Grok 결과
  □ Opus 결과
  □ 알려진 한계
  □ Phase P1+ 권고
```

---

## 2. AUTO-DEBUG 7-step (게이트 실패 시)

게이트 1개라도 실패하면 즉시 진입:

### Step 1: ERROR_CAPTURE

```bash
# 모든 에러 + 환경 캡처
mkdir -p tasks/post-mortem/$(date +%Y%m%d-%H%M%S)
cd tasks/post-mortem/$(date +%Y%m%d-%H%M%S)

# 1.1 tsc 에러
npx tsc --noEmit 2>&1 | tee tsc-errors.log

# 1.2 vitest 에러
npx vitest run 2>&1 | tee vitest-errors.log

# 1.3 scan 에러
bash ../../../scripts/scan-principles.sh 2>&1 | tee scan-errors.log

# 1.4 환경 정보
node --version > env.log
npm --version >> env.log
docker compose ps >> env.log
git log --oneline -5 >> env.log
git status >> env.log
```

### Step 2: CONTEXT_LOAD

```
실패 직전 변경된 파일 3개 다시 읽기:
- git diff HEAD~1 --name-only | head -3
- 각 파일 전체 내용 reload (context window 갱신)
- 의존 모듈도 reload
```

### Step 3: HYPOTHESIS

```
가능한 원인 3가지 나열 (확률 표기):

가설 1: {원인} (확률 ~40%)
  근거: {에러 메시지의 어느 부분이 이를 뒷받침}
  검증 방법: {1줄 명령}

가설 2: {원인} (확률 ~35%)
  근거: ...
  검증 방법: ...

가설 3: {원인} (확률 ~25%)
  근거: ...
  검증 방법: ...

확률 합 100% 필수. 가설 3개 모두 가짜일 가능성도 명시.
```

### Step 4: ISOLATE

```
최소 재현 케이스 작성:
- packages/api/test/debug/{issue-id}.spec.ts 새 파일
- 가설 1의 시나리오만 격리 테스트
- 실패 재현 확인
```

### Step 5: FIX

```
한 번에 한 변경:
- 가설 1 기준 수정
- 1개 파일·1개 변경
- 변경 사이즈 최소화
- 변경 직전 커밋: git commit -m "checkpoint: before fix attempt"
```

### Step 6: VERIFY

```bash
# 3-게이트 재실행
npx tsc --noEmit
npx vitest run
bash scripts/scan-principles.sh

# 통과 시:
git commit -m "fix: {issue-id} via {hypothesis}"

# 실패 시:
git reset --hard HEAD~1  # checkpoint로 되돌리기
# → Step 3으로 (다음 가설 시도)
```

### Step 7: POST-MORTEM

```markdown
# tasks/post-mortem/{date}/POST-MORTEM.md

## 이슈 ID: {ID}
## 일시: {datetime}
## Phase: {phase}
## 작업: {task}

## 증상
{에러 메시지 + 게이트 어느 것 실패}

## 시도한 가설
1. {가설1} - 결과: {성공/실패/부분성공}
2. {가설2} - 결과: ...
3. {가설3} - 결과: ...

## 실제 원인
{최종 원인}

## 수정 사항
- 파일: {경로}
- diff: {요약}
- commit: {hash}

## 재발 방지
- 추가 테스트: {테스트 코드}
- scan-principles 룰 추가: {규칙}
- 문서 업데이트: {문서}

## 학습
{이번 디버깅에서 얻은 인사이트}
```

---

## 3. 3회 실패 시 HumanGate

AUTO-DEBUG 7-step을 동일 이슈에 대해 3회 시도하고도 실패하면:

```
1. 작업 자동 중단
2. tasks/post-mortem/{date}/HUMAN-GATE-REQUEST.md 생성:
   - 3회 시도 요약
   - 각 시도의 가설·결과·post-mortem 링크
   - 가능한 다음 단계 3가지
3. 사용자에게 알림 + 결정 대기
4. 사용자 결정:
   a) 다른 접근으로 재시도
   b) 작업 범위 축소
   c) Phase 일시 중단 + 다른 Phase로 이동
   d) 외부 자문 (Opus peer review 등)
   e) Mountain 봉인 필요 여부 확인
```

---

## 4. Phase 완료 게이트 자동화

`scripts/phase-gate.sh`:

```bash
#!/usr/bin/env bash
# Phase Gate Verification Script
# Usage: bash scripts/phase-gate.sh {phase_number}

set -e

PHASE=${1:-0}
echo "================================================"
echo "  Coesite Phase $PHASE Gate Verification"
echo "================================================"

# Gate 1: TypeScript
echo "[Gate 1/4] TypeScript..."
npx tsc --noEmit
echo "✅ Gate 1 OK"
echo ""

# Gate 2: Vitest
echo "[Gate 2/4] Vitest..."
npx vitest run --coverage
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "❌ Coverage $COVERAGE% < 80%"
  exit 1
fi
echo "✅ Gate 2 OK (coverage $COVERAGE%)"
echo ""

# Gate 3: Scan Principles
echo "[Gate 3/4] Scan Principles..."
bash scripts/scan-principles.sh
echo "✅ Gate 3 OK"
echo ""

# Gate 4: Security Wall
echo "[Gate 4/4] Security Wall..."
bash scripts/security-wall.sh
echo "✅ Gate 4 OK"
echo ""

echo "================================================"
echo "  🎉 Phase $PHASE Gate PASSED"
echo "================================================"

# Git tag
git tag "phase${PHASE}-complete-$(date +%Y%m%d)"
echo "Tagged: phase${PHASE}-complete-$(date +%Y%m%d)"

# 회고 템플릿 생성
RETRO="tasks/phase${PHASE}/RETROSPECTIVE.md"
if [ ! -f "$RETRO" ]; then
  cat > "$RETRO" << EOF
# Phase $PHASE Retrospective

## 완료 일자
$(date)

## 통과한 게이트
- Gate 1 (tsc): ✅
- Gate 2 (vitest): ✅ (coverage ${COVERAGE}%)
- Gate 3 (scan-principles): ✅
- Gate 4 (security-wall): ✅

## 산출물 요약
- 추가 파일: {수동 작성}
- 추가 테스트: {수동 작성}
- 핵심 모듈: {수동 작성}

## 잘된 점
- 

## 개선할 점
- 

## 다음 Phase 사전 점검
- 의존성 확인:
- 위험 요소:

## 메모
- 

EOF
  echo ""
  echo "📝 RETROSPECTIVE 템플릿 생성: $RETRO"
  echo "   작성 후 다음 Phase 진입."
fi
```

---

## 5. 최종 완료 기준 (Phase 6 + Phase 7 종료)

```
□ 7 Phase 모두 게이트 통과 + 회고 작성
□ E2E 5 시나리오 100% 통과
□ Grok adversarial 11종 차단
□ 총 vitest 550+ 케이스
□ 커버리지 80%+ (라인) / 70%+ (브랜치)
□ tsc --noEmit 0 오류
□ scan-principles P1~P10 0 위반
□ security-wall Mountain 0건
□ npm audit 0 high+ critical
□ Snyk/Dependabot 0 critical
□ SDK npm publish 가능 상태
□ OpenAPI Validator 통과
□ README 30분 통합 가이드 + 외부 확인
□ Terraform 모듈 적용 검증 (dev 환경)
□ S3 Object Lock 7년 설정 확인
□ Postgres WORM 트리거 100건 테스트 100건 차단
□ HumanGate toolCall 제외 자동 검증
□ ConsensusGate 1엔진 장애 시뮬레이션
□ DMS Dry-Run + 실제 트리거 시뮬레이션
□ Heartbeat 중단 → DMS 트리거 검증
□ SECURITY-AUDIT-REPORT.md 완성
□ 14주 진행 일지 (Phase별 회고) 완성
□ Git tag: coesite-mvp-p0-v1.0.0
□ 외부 감사 (Opus peer review) 통과
□ Facil 파일럿 진입 준비 완료 (별도 세션)
```

---

## 6. 검증 도구 체크리스트

```
필수 설치:
□ Node.js 22 LTS
□ pnpm 9+
□ Docker Desktop / Docker Engine 24+
□ AWS CLI 2 + AWS 계정
□ Terraform 1.7+
□ jq, yq (JSON/YAML 파서)
□ bc (계산기)
□ Git 2.40+

선택 설치 (Phase 7):
□ k6 (부하 테스트)
□ TruffleHog (시크릿 스캔)
□ Snyk CLI (취약점 스캔)
□ act (로컬 GitHub Actions)
□ testcontainers (E2E 격리 환경)
```

---

## 7. 일일 점검 루틴

매일 작업 시작 시:

```bash
# 1. 환경 상태
docker compose ps
node --version

# 2. 마지막 작업 상태
git log --oneline -5
cat tasks/current-task.md  # 어제 작성한 다음 액션

# 3. Security Wall 사전 점검
bash scripts/security-wall.sh

# 4. 게이트 상태 (skel만이라도)
npx tsc --noEmit | tail -5

# 5. 오늘 계획
echo "Today: {Phase X / Task Y}"
```

매일 작업 종료 시:

```bash
# 1. 진행 상황 커밋
git add -A
git commit -m "wip: {Phase X · Task Y · {요약}}"

# 2. 내일 액션 기록
echo "Tomorrow: {다음 단계}" > tasks/current-task.md

# 3. Security Wall 사후 점검
bash scripts/security-wall.sh

# 4. 일일 회고
echo "$(date): {오늘 한 것}" >> tasks/daily-log.md
```

---

*검증 없는 진행은 기술 부채다. 모든 Phase 게이트를 통과한다.*
