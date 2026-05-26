import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { M1GateService, type M1GateEvaluation } from "../allowlist-gted";
import {
  MirrorModelService,
  SemanticFirewallService,
} from "../semantic-firewall";
import {
  DeceptionGateService,
  HoneypotService,
  PolyintentService,
  type PolyintentResult,
} from "../siren";
import type { MetaLayerEvaluation, MetaLayerInput } from "./types";

@Injectable()
export class MetaLayerService {
  constructor(
    @Inject(M1GateService)
    private readonly m1GateService: M1GateService,
    @Inject(SemanticFirewallService)
    private readonly semanticFirewallService: SemanticFirewallService,
    @Inject(MirrorModelService)
    private readonly mirrorModelService: MirrorModelService,
    @Inject(PolyintentService)
    private readonly polyintentService: PolyintentService,
    @Inject(DeceptionGateService)
    private readonly deceptionGateService: DeceptionGateService,
    @Inject(HoneypotService)
    private readonly honeypotService: HoneypotService,
  ) {}

  async evaluate(input: MetaLayerInput): Promise<MetaLayerEvaluation> {
    const semantic = this.semanticFirewallService.inspect(input.payload);
    const polyintent = this.polyintentService.analyze(input.payload);

    if (this.honeypotService.isKnownPath(input.path)) {
      const honeypotRecord = this.honeypotService.recordAccess({
        path: input.path,
        requestId: input.requestId,
        sessionRef: input.sessionRef,
        sourceIp: input.sourceIp,
      });
      return {
        control: "DENY",
        honeypotRecord,
        honeypotRoutes: [],
        m1: [],
        polyintent,
        reason: "honeypot_access",
        semantic,
      };
    }

    const m1 = await this.evaluateM1(input.candidateTokens ?? []);
    const m1Block = m1.find((evaluation) => evaluation.control === "BLOCK");
    const mirrorExpectation = this.mirrorModelService.createExpectation(semantic);

    if (semantic.control === "BLOCK") {
      return {
        control: "DENY",
        honeypotRoutes: [],
        m1,
        polyintent,
        reason: "semantic_block",
        semantic,
      };
    }

    if (m1Block !== undefined) {
      return {
        control: "DENY",
        honeypotRoutes: [],
        m1,
        polyintent,
        reason: "m1_block",
        semantic,
      };
    }

    if (polyintent.route === "DENY") {
      return {
        control: "DENY",
        honeypotRoutes: [],
        m1,
        polyintent,
        reason: "siren_deny",
        semantic,
      };
    }

    const requiresSiren =
      m1.some((evaluation) => evaluation.control === "OBSERVE") ||
      mirrorExpectation.expectedControl === "OBSERVE" ||
      polyintent.route === "DECEPTION_GATE";

    if (requiresSiren) {
      const sirenResult =
        polyintent.route === "DECEPTION_GATE"
          ? polyintent
          : createSyntheticSirenResult("meta_layer_handoff");
      const decoy = this.deceptionGateService.createDecoy(sirenResult, {
        requestId: input.requestId,
      });
      const honeypotRoutes = this.honeypotService.createRoutes(sirenResult, {
        requestId: input.requestId,
      });

      return {
        control: "DECEIVE",
        decoy,
        honeypotRoutes,
        m1,
        polyintent: sirenResult,
        reason: "siren_deception",
        semantic,
      };
    }

    return {
      control: "ALLOW",
      honeypotRoutes: [],
      m1,
      polyintent,
      reason: "allow",
      semantic,
    };
  }

  private async evaluateM1(
    candidateTokens: readonly string[],
  ): Promise<readonly M1GateEvaluation[]> {
    if (candidateTokens.length === 0) {
      return [
        {
          control: "BLOCK",
          normalizedToken: "",
          reason: "no_candidate_tokens",
        },
      ];
    }

    const evaluations: M1GateEvaluation[] = [];
    for (const token of candidateTokens) {
      evaluations.push(await this.m1GateService.evaluateToken(token));
    }

    return evaluations;
  }
}

function createSyntheticSirenResult(reason: string): PolyintentResult {
  return {
    entropy: 0,
    intents: [
      {
        category: "prompt_obfuscation",
        evidenceHash: createHash("sha256").update(reason).digest("hex").slice(0, 32),
        probability: 1,
        ruleId: "siren.intent.meta_layer_handoff.v1",
        weight: 70,
      },
    ],
    reason: "suspicious_intent",
    riskScore: 70,
    route: "DECEPTION_GATE",
  };
}
