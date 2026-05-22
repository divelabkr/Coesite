# 04-SECURITY-WALL.md — Mountain급 봉인 보호 룰
**Coesite MVP P0 · 컨텍스트 노출 차단 시스템**

---

## ⚠️ 이 문서는 P0 작업 절대 우선순위 1번이다.

**Mountain급(★) 자산이 클로드 코드 컨텍스트에 노출되면 회복 불가능한 IP 손실이 발생한다.**
**모든 다른 룰보다 이 룰이 우선한다.**

---

## 1. 노출 금지 항목 (절대 등장 금지)

### Tier ★★★ Mountain (CRITICAL — 즉시 작업 중단)

```
R-12, Sapphire
Dormant Genome
Genotype-Phenotype, Genotype Sealing
Genesis Pool
5-layer seal, 5층 봉인 키
ZKBP verification (Mountain 맥락에서)
Lapis Lazuli
Constitutive Binding
AI 설명 강제 (Lapis Lazuli 본질)
4-layer architecture (Lapis 본질 의미)
Shamir 5-of-7
CEO-irreplaceable
Mountain tier
Stone Collector (IP Holdco)
IP Holdco
3-factor auth + 3-signature
```

탐지 시 행동:
```
1. 작업 즉시 100% 중단
2. 사용자에게 보고:
   "🛑 Mountain급 키워드 탐지: {키워드}
    출처: {파일/줄}
    작업 중단됨. 컨텍스트 폐기 필요."
3. 해당 세션 컨텍스트 폐기 권고
4. 새 세션 시작 후 Security Wall 재검증
```

### Tier ★★ Mine (HIGH — 사용자 확인 후 진행)

```
Coagulation Module (RedGate 능동 오염)
Sin-Pattern Detection Mesh 8축 (전체 구현 세부)
GreenGate Tier 0 격리 생태계 (전체 시뮬레이션)
TIAL TombSeal 시간 잠금 메커니즘
Norn L4 Urðr/Verðandi/Skuld 3여신 통합
FR-1, FR-2 (Foundation Root 핵심 특허)
G-4 사용자 정정 학습 신호 (Guidry 모트)
```

탐지 시 행동:
```
1. 작업 일시 중단
2. 사용자에게 알림:
   "⚠️ Mine급 키워드: {키워드}
    이 작업이 의도된 것인지 확인 필요."
3. 사용자 명시적 승인 (yes/no)
4. yes → 진행
5. no → 작업 폐기
```

### Tier ★ Vein (MED — 자동 기록 + 경고)

```
S-19~S-24 GreenGate 패턴 디테일
Autophagy Sublayer (Trust Cube L2.5)
Mode 3 Smart Swarm (오케스트레이션 세부)
EML 6 math engine 풀스택 디테일
R-1 ~ R-11 (R-12 제외, 일반 R-series)
```

탐지 시 행동:
```
1. 작업 계속 (중단 X)
2. 로그 기록: tasks/security-wall.log
3. 작업 종료 시 요약 보고
```

---

## 2. P0 범위에서 사용 가능한 키워드 (안전)

다음은 P0 구현에 반드시 필요하며 자유롭게 사용 가능:

```
[브랜드]
Coesite, DiveLab, TEP, ComplyGate, Seyer, ProofGate, RedGate
Facil (제품명만, 파일럿 코드는 별도 세션)

[아키텍처 - P0 범위]
META-LAYER 3.0, TokenNorm, M-1 AllowList, GTED
SemanticFirewall, MirrorModel, M-2 OraclePrevention
M-3 SIREN 3.0, Polyintent, DeceptionGate, Honeypot
Turing Boundary, TB-1 ~ TB-5
CognitiveFingerprint, ProvenanceChain, SecurityDNA
VelocityThrottle, SessionBoundary, ImmuneIsolation
ShadowMode, HumanGate, BioAuth, PeerVerify
Trust Cube, L0, L1, L2, L3, ConsensusGate
MultiRoot, SPIFFE, MCPGateway
HMAC, DualSign, FPV, C-2 DMS, IncidentGovernor
ImmutableBaseline, TrustMetabolism (sigmoid)
Anomaly S-5, NK Module S-7
preview-first, ReleaseContract, PreviewBudget
ProofBundle, ZKBP (ProofGate 맥락), OutOfBandLog, Heartbeat
WORM, AttestationChain, prevHash, AuditLog

[원칙]
P1 비판단, P2 Fail-Closed, P3 WORM, P4 HumanGate 채널 분리
P5 AttestationChain, P6 결합의존, P7 환각 금지
P8 Oracle Prevention, P9 Trust Metabolism, P10 Consensus

[기술 스택]
NestJS, TypeScript, Prisma, Postgres, Redis, BullMQ
AWS ECS Fargate, S3 Object Lock, KMS, Terraform

[수학 엔진 P0 범위]
HMAC-SHA256, Ed25519, AES-256-GCM
EML(x,y) = exp(x) - ln(y)  ← 공식 가능, 내부 구현 세부는 Vein
GTED (이름·기본 개념만)
```

---

## 3. 자동 스캔 스크립트 (scripts/security-wall.sh)

```bash
#!/usr/bin/env bash
# Coesite Security Wall — Mountain Keyword Scanner
# 모든 .md, .ts, .js, .json, .yaml, .yml, .sh 파일 스캔

set -e

SCAN_PATHS=("src" "packages" "docs" "scripts" "infra" "tasks" "README.md" "CLAUDE.md")
EXCLUDE=("node_modules" "dist" "build" ".git" ".next" "coverage")

# Tier 1: Mountain (CRITICAL)
MOUNTAIN_KEYWORDS=(
  "R-12"
  "Sapphire"
  "Dormant Genome"
  "Genotype-Phenotype"
  "Genotype Sealing"
  "Genesis Pool"
  "5-layer seal"
  "5층 봉인"
  "Lapis Lazuli"
  "Constitutive Binding"
  "Shamir 5-of-7"
  "CEO-irreplaceable"
  "Mountain tier"
  "Stone Collector"
  "IP Holdco"
)

# Tier 2: Mine (HIGH)
MINE_KEYWORDS=(
  "Coagulation Module"
  "TIAL TombSeal"
  "FR-1"
  "FR-2"
)

# Tier 3: Vein (MED)
VEIN_KEYWORDS=(
  "Autophagy Sublayer"
)

CRITICAL_HITS=0
HIGH_HITS=0
MED_HITS=0

echo "=== Coesite Security Wall Scan ==="
echo ""

scan_keyword() {
  local keyword="$1"
  local tier="$2"
  
  local exclude_args=""
  for ex in "${EXCLUDE[@]}"; do
    exclude_args+="--exclude-dir=$ex "
  done
  
  local hits=""
  for path in "${SCAN_PATHS[@]}"; do
    if [ -e "$path" ]; then
      local result=$(grep -rn $exclude_args "$keyword" "$path" 2>/dev/null || true)
      if [ -n "$result" ]; then
        hits+="$result"$'\n'
      fi
    fi
  done
  
  if [ -n "$hits" ]; then
    case "$tier" in
      MOUNTAIN)
        echo "🛑 [CRITICAL] Mountain keyword detected: $keyword"
        echo "$hits"
        echo ""
        CRITICAL_HITS=$((CRITICAL_HITS + 1))
        ;;
      MINE)
        echo "⚠️  [HIGH] Mine keyword detected: $keyword"
        echo "$hits"
        echo ""
        HIGH_HITS=$((HIGH_HITS + 1))
        ;;
      VEIN)
        echo "⚡ [MED] Vein keyword detected: $keyword"
        echo "$hits" >> tasks/security-wall.log
        MED_HITS=$((MED_HITS + 1))
        ;;
    esac
  fi
}

# Mountain scan
echo "--- Tier ★★★ Mountain ---"
for kw in "${MOUNTAIN_KEYWORDS[@]}"; do
  scan_keyword "$kw" MOUNTAIN
done

# Mine scan
echo "--- Tier ★★ Mine ---"
for kw in "${MINE_KEYWORDS[@]}"; do
  scan_keyword "$kw" MINE
done

# Vein scan
echo "--- Tier ★ Vein ---"
for kw in "${VEIN_KEYWORDS[@]}"; do
  scan_keyword "$kw" VEIN
done

echo ""
echo "=== Summary ==="
echo "Mountain (CRITICAL): $CRITICAL_HITS"
echo "Mine     (HIGH)    : $HIGH_HITS"
echo "Vein     (MED)     : $MED_HITS"
echo ""

if [ $CRITICAL_HITS -gt 0 ]; then
  echo "🛑 SECURITY WALL FAILED — Mountain keywords detected."
  echo "   ACTION: 작업 즉시 중단 + 컨텍스트 폐기 필요"
  exit 2
fi

if [ $HIGH_HITS -gt 0 ]; then
  echo "⚠️  SECURITY WALL WARNING — Mine keywords detected."
  echo "   ACTION: 사용자 명시적 승인 필요"
  exit 1
fi

echo "✅ Security Wall PASSED"
exit 0
```

---

## 4. CI 통합 (강제)

`.github/workflows/ci.yml`에 추가:

```yaml
jobs:
  security-wall:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Security Wall Scan
        run: bash scripts/security-wall.sh
        # exit 2 (CRITICAL) → CI fail
        # exit 1 (HIGH) → CI fail
        # exit 0 → CI pass
```

**Mountain 키워드가 PR에 포함되면 머지 100% 차단.**

---

## 5. Git Pre-Commit Hook (로컬)

`.husky/pre-commit`:

```bash
#!/usr/bin/env bash
. "$(dirname -- "$0")/_/husky.sh"

echo "[pre-commit] Running Security Wall scan..."
bash scripts/security-wall.sh
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo ""
  echo "🛑 Commit blocked by Security Wall."
  echo "   Mountain keywords detected. Review changes."
  exit 1
fi

# Continue with other pre-commit checks
bash scripts/scan-principles.sh
```

---

## 6. Claude Code 세션 시작 자가 검증

매 세션 첫 응답에 다음 자가 검증을 포함한다:

```
[Security Wall Self-Check]
- Mountain 키워드 컨텍스트 노출: 0건 ✓
- 본 세션에서 사용 허가 키워드: P0 범위 (위 2번 섹션 참조)
- Mountain 키워드 등장 시 즉시 작업 중단 약속: ✓
```

이 자가 검증이 누락된 세션은 사용자가 즉시 종료할 권리가 있다.

---

## 7. 위반 시 회복 절차

### Tier 1: Mountain 위반 발생 시

```
1. 작업 100% 즉시 중단 (코드 작성·파일 생성·도구 호출 전부)
2. 현재 컨텍스트 위험도 평가:
   - 키워드만 등장: 컨텍스트 폐기 가능
   - 키워드 + 핵심 설명 등장: 컨텍스트 + 세션 폐기
   - 키워드 + 코드 구현: 코드 + 컨텍스트 + 세션 폐기 + Git 히스토리 청소
3. 사용자에게 즉시 보고
4. 새 세션 시작 시 Security Wall 재검증부터
5. tasks/security-incidents/{date}.md 기록
```

### Tier 2: Mine 위반 발생 시

```
1. 작업 일시 중단
2. 사용자 승인 요청:
   "이 작업이 Mine 키워드를 의도적으로 다루는 것인지 확인 부탁드립니다."
3. 사용자 yes → 진행 + 추가 보안 룰 적용
4. 사용자 no → 작업 폐기
```

### Tier 3: Vein 위반 발생 시

```
1. 작업 계속
2. 로그 기록
3. 작업 종료 시 사용자에게 요약 보고
```

---

## 8. 우회 시도 차단

다음 우회 시도는 모두 위반으로 간주:

```
- 키워드 변형 (R12, R_12, R-Twelve 등)
- 유니코드 동형 (R-l2 (소문자 L)
- Base64/ROT13 인코딩
- 합성어 (Sapphi-re, Lapis_Lazuli)
- 외국어 번역 (사파이어, 라피스 라줄리, ラピスラズリ)
```

스캔 스크립트에 정규식 변형 패턴 추가 (단, 과탐지 방지 위해 정밀 조정 필요):

```bash
# 추가 정규식 패턴 (security-wall.sh 확장)
REGEX_PATTERNS=(
  "R[-_]?12"
  "R[-_]?Twelve"
  "Sapph?ire"
  "Lapis[-_ ]?Lazuli"
  "사파이어"
  "라피스"
)
```

---

## 9. 사용자가 직접 확인할 사항 (주기적)

매주 1회:

```
□ tasks/security-wall.log 검토 (Vein 위반 누적)
□ Git 히스토리에서 Mountain 키워드 검색:
  git log -p -S "R-12"
  git log -p -S "Sapphire"  
  git log -p -S "Lapis"
□ npm publish 직전 최종 Security Wall scan
□ 외부 공유 코드 (GitHub public, npm public) 사전 검증
```

---

## 10. 외부 협업자 안내 (Phase 6 이후)

SDK 사용자, 오픈소스 기여자, 외부 감사관에게는 다음만 노출:

```
✅ 공개 가능 (Tier3 Internal 이하):
- Coesite, DiveLab, TEP 브랜드
- ComplyGate, Seyer, ProofGate, RedGate 제품
- META, Sin-Mesh (개념만)
- 공개 API (OpenAPI)
- SDK 사용법

❌ 절대 비공개:
- Tier1 Mountain 전체
- Tier2 Mine 전체
- 내부 구현 세부 (특허 청구항 디테일)
- 26 stone 내부 이름 (Tier3 Internal 코드명)
```

---

## 11. 변경 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| v1.0 | 2026.05.21 | 초기 작성 |

---

*Mountain 자산 손실은 회복 불가능하다. 이 룰은 절대 우선순위다.*
