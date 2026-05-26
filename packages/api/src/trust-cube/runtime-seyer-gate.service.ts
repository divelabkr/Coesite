import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { OraclePreventionService } from "../common/oracle-prevention";
import type { MetaLayerEvaluation } from "../meta-layer/meta-layer";
import { MetaLayerService } from "../meta-layer/meta-layer";
import { TokenNormService, type TokenNormFinding } from "../meta-layer/token-norm";
import {
  CognitiveFingerprintService,
  ProvenanceChainService,
  SessionBudgetService,
  VelocityThrottleService,
  type CognitiveFingerprintMatch,
  type ProvenanceRecord,
  type SessionBudgetResult,
  type VelocityThrottleResult,
} from "../turing";
import {
  ComplyGateService,
  type ComplyGateResult,
  type SignedComplyPolicy,
} from "./comply-gate.service";
import type { ConsensusVote } from "./consensus-gate.service";
import { SeyerGateService, type SeyerGateResult } from "./seyer-gate.service";
import {
  TrustMetabolismService,
  type TrustDecayInput,
  type TrustMetabolismResult,
} from "./trust-metabolism.service";

export interface RuntimeSeyerNkSignals {
  readonly semanticZero: boolean;
  readonly spatialZero: boolean;
  readonly temporalZero: boolean;
}

export interface RuntimeSeyerBehaviorInput {
  readonly requestIntervalsMs: readonly number[];
  readonly responseCodes: readonly number[];
  readonly tokenCounts: readonly number[];
}

export interface RuntimeSeyerGateInput {
  readonly agentId: string;
  readonly approverRefs: readonly string[];
  readonly behavior: RuntimeSeyerBehaviorInput;
  readonly candidateTokens: readonly string[];
  readonly nkSignals?: RuntimeSeyerNkSignals;
  readonly now: Date;
  readonly path: string;
  readonly payload: unknown;
  readonly policy: SignedComplyPolicy;
  readonly policyVersion: string;
  readonly requestId: string;
  readonly requesterRef: string;
  readonly runtimeVersion: string;
  readonly sessionBudgetCost: number;
  readonly sessionId: string;
  readonly sourceIp: string;
  readonly trust: TrustDecayInput;
}

export interface RuntimeSeyerGateResult {
  readonly control: "DENY" | "PASS";
  readonly seyer: SeyerGateResult;
  readonly tokenNormFindings: readonly TokenNormFinding[];
  readonly metaLayer?: MetaLayerEvaluation;
  readonly fingerprint?: CognitiveFingerprintMatch;
  readonly provenance: ProvenanceRecord;
  readonly velocity?: VelocityThrottleResult;
  readonly sessionBudget?: SessionBudgetResult;
  readonly policy?: ComplyGateResult;
  readonly trust?: TrustMetabolismResult;
  readonly nk?: "DENY" | "PASS";
  readonly votes: readonly ConsensusVote[];
}

@Injectable()
export class RuntimeSeyerGateService {
  constructor(
    @Inject(TokenNormService)
    private readonly tokenNormService: TokenNormService,
    @Inject(OraclePreventionService)
    private readonly oraclePreventionService: OraclePreventionService,
    @Inject(MetaLayerService)
    private readonly metaLayerService: MetaLayerService,
    @Inject(CognitiveFingerprintService)
    private readonly cognitiveFingerprintService: CognitiveFingerprintService,
    @Inject(ProvenanceChainService)
    private readonly provenanceChainService: ProvenanceChainService,
    @Inject(VelocityThrottleService)
    private readonly velocityThrottleService: VelocityThrottleService,
    @Inject(SessionBudgetService)
    private readonly sessionBudgetService: SessionBudgetService,
    @Inject(ComplyGateService)
    private readonly complyGateService: ComplyGateService,
    @Inject(TrustMetabolismService)
    private readonly trustMetabolismService: TrustMetabolismService,
    @Inject(SeyerGateService)
    private readonly seyerGateService: SeyerGateService,
  ) {}

  async evaluate(input: RuntimeSeyerGateInput): Promise<RuntimeSeyerGateResult> {
    const tokenNorm = this.tokenNormService.normalize(input.payload, "$.payload");
    const payloadHash = hashSanitizedPayload(tokenNorm.value);
    const provenance = this.provenanceChainService.append({
      agentId: input.agentId,
      payloadHash,
      policyVersion: input.policyVersion,
      runtimeVersion: input.runtimeVersion,
    });

    if (tokenNorm.findings.length > 0) {
      return this.finish({
        input,
        provenance,
        stepControls: {
          anomaly: "DENY",
          budget: "DENY",
          nk: "DENY",
          oracle: "PASS",
          policy: "DENY",
          rule: "DENY",
          session: "DENY",
          sod: "DENY",
          tokenNorm: "DENY",
          trust: "DENY",
        },
        tokenNormFindings: tokenNorm.findings,
        votes: createVotes("DENY", "DENY", "DENY"),
      });
    }

    const metaLayer = await this.metaLayerService.evaluate({
      candidateTokens: input.candidateTokens,
      path: input.path,
      payload: tokenNorm.value,
      requestId: input.requestId,
      sessionRef: input.sessionId,
      sourceIp: input.sourceIp,
    });
    const policy = this.complyGateService.evaluate(input.policy);
    const fingerprint = this.cognitiveFingerprintService.registerOrMatch({
      agentId: input.agentId,
      requestIntervalsMs: input.behavior.requestIntervalsMs,
      responseCodes: input.behavior.responseCodes,
      tokenCounts: input.behavior.tokenCounts,
    });
    const velocity = this.velocityThrottleService.registerHit(
      input.agentId,
      input.now,
    );
    const sessionBudget = this.sessionBudgetService.consume(
      input.sessionId,
      input.sessionBudgetCost,
      input.now,
    );
    const trust = this.trustMetabolismService.decay(input.trust);

    const tokenNormControl = "PASS";
    const oracleControl = this.oraclePreventionService.isSuccessStatus(200)
      ? "PASS"
      : "DENY";
    const policyControl = policy.control;
    const sodControl = evaluateSod(input);
    const ruleControl =
      metaLayer.control === "ALLOW" && policy.control === "PASS"
        ? "PASS"
        : "DENY";
    const anomalyControl =
      velocity.control === "PASS" && fingerprint.control === "PASS"
        ? "PASS"
        : "DENY";
    const nkControl = evaluateNk(input.nkSignals);
    const trustControl = trust.trustScore >= 50 ? "PASS" : "DENY";
    const sessionControl = sessionBudget.control;
    const budgetControl = sessionBudget.control;
    const consensusVoter =
      policyControl === "PASS" &&
      sodControl === "PASS" &&
      nkControl === "PASS" &&
      trustControl === "PASS" &&
      sessionControl === "PASS" &&
      this.provenanceChainService.detectBreak().intact
        ? "PASS"
        : "DENY";
    const votes = createVotes(ruleControl, anomalyControl, consensusVoter);

    return this.finish({
      fingerprint,
      input,
      metaLayer,
      nk: nkControl,
      policy,
      provenance,
      sessionBudget,
      stepControls: {
        anomaly: anomalyControl,
        budget: budgetControl,
        nk: nkControl,
        oracle: oracleControl,
        policy: policyControl,
        rule: ruleControl,
        session: sessionControl,
        sod: sodControl,
        tokenNorm: tokenNormControl,
        trust: trustControl,
      },
      tokenNormFindings: tokenNorm.findings,
      trust,
      velocity,
      votes,
    });
  }

  private finish(args: {
    readonly fingerprint?: CognitiveFingerprintMatch;
    readonly input: RuntimeSeyerGateInput;
    readonly metaLayer?: MetaLayerEvaluation;
    readonly nk?: "DENY" | "PASS";
    readonly policy?: ComplyGateResult;
    readonly provenance: ProvenanceRecord;
    readonly sessionBudget?: SessionBudgetResult;
    readonly stepControls: {
      readonly anomaly: "DENY" | "PASS";
      readonly budget: "DENY" | "PASS";
      readonly nk: "DENY" | "PASS";
      readonly oracle: "DENY" | "PASS";
      readonly policy: "DENY" | "PASS";
      readonly rule: "DENY" | "PASS";
      readonly session: "DENY" | "PASS";
      readonly sod: "DENY" | "PASS";
      readonly tokenNorm: "DENY" | "PASS";
      readonly trust: "DENY" | "PASS";
    };
    readonly tokenNormFindings: readonly TokenNormFinding[];
    readonly trust?: TrustMetabolismResult;
    readonly velocity?: VelocityThrottleResult;
    readonly votes: readonly ConsensusVote[];
  }): RuntimeSeyerGateResult {
    const seyer = this.seyerGateService.evaluate({
      anomaly: args.stepControls.anomaly,
      budget: args.stepControls.budget,
      consensusVotes: args.votes,
      nk: args.stepControls.nk,
      oracle: args.stepControls.oracle,
      policy: args.stepControls.policy,
      session: args.stepControls.session,
      sod: args.stepControls.sod,
      tokenNorm: args.stepControls.tokenNorm,
      trust: args.stepControls.trust,
    });

    return {
      control: seyer.control,
      fingerprint: args.fingerprint,
      metaLayer: args.metaLayer,
      nk: args.nk,
      policy: args.policy,
      provenance: args.provenance,
      seyer,
      sessionBudget: args.sessionBudget,
      tokenNormFindings: args.tokenNormFindings,
      trust: args.trust,
      velocity: args.velocity,
      votes: args.votes,
    };
  }
}

function evaluateSod(input: RuntimeSeyerGateInput): "DENY" | "PASS" {
  const approvers = new Set(input.approverRefs);
  if (approvers.size < 2 || approvers.has(input.requesterRef)) {
    return "DENY";
  }

  return "PASS";
}

function evaluateNk(signals: RuntimeSeyerNkSignals | undefined): "DENY" | "PASS" {
  if (
    signals?.semanticZero === true &&
    signals.spatialZero === true &&
    signals.temporalZero === true
  ) {
    return "DENY";
  }

  return "PASS";
}

function createVotes(
  rule: "DENY" | "PASS",
  anomaly: "DENY" | "PASS",
  consensus: "DENY" | "PASS",
): readonly ConsensusVote[] {
  return [
    { control: rule, engine: "RuleEngine" },
    { control: anomaly, engine: "AnomalyEngine" },
    { control: consensus, engine: "ConsensusVoter" },
  ];
}

function hashSanitizedPayload(payload: unknown): string {
  return createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function normalizeJson(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }

  if (typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeJson((value as Record<string, unknown>)[key]);
    }
    return normalized;
  }

  return null;
}
