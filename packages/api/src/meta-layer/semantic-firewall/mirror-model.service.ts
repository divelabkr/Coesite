import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";

import type {
  MirrorComparison,
  MirrorExpectation,
  SemanticFirewallResult,
} from "./types";

const RESPONSE_LEAK_PATTERNS: readonly RegExp[] = [
  /hidden\s+system\s+prompt/iu,
  /system\s+prompt/iu,
  /developer\s+rules?/iu,
  /\bapi\s+key\b/iu,
  /\bsigning\s+material\b/iu,
];

@Injectable()
export class MirrorModelService {
  createExpectation(result: SemanticFirewallResult): MirrorExpectation {
    if (result.control === "BLOCK") {
      return {
        categories: result.findings.map((finding) => finding.category),
        expectedControl: "BLOCK",
        responseShape: "uniform_rejection",
        riskScore: result.riskScore,
      };
    }

    if (result.control === "OBSERVE") {
      return {
        categories: result.findings.map((finding) => finding.category),
        expectedControl: "OBSERVE",
        handoff: "SIREN",
        responseShape: "siren_handoff",
        riskScore: result.riskScore,
      };
    }

    return {
      categories: [],
      expectedControl: "PASS",
      responseShape: "normal_control",
      riskScore: result.riskScore,
    };
  }

  compareResponse(
    expectation: MirrorExpectation,
    response: unknown,
  ): MirrorComparison {
    if (response === null || typeof response !== "object") {
      return block("invalid_response_shape");
    }

    const leakHash = this.findLeakHash(response);
    if (leakHash !== undefined) {
      return {
        control: "BLOCK",
        evidenceHash: leakHash,
        matchesExpectation: false,
        reason: "response_leak_pattern",
      };
    }

    const responseRecord = response as Record<string, unknown>;
    const control = responseRecord.control;
    if (control !== "PASS" && control !== "OBSERVE" && control !== "BLOCK") {
      return block("invalid_response_shape");
    }

    if (expectation.expectedControl === "OBSERVE") {
      if (control === "PASS") {
        return block("handoff_missing");
      }

      if (control === "OBSERVE" && responseRecord.handoff === "SIREN") {
        return pass();
      }

      return block("control_mismatch");
    }

    if (control !== expectation.expectedControl) {
      return block("control_mismatch");
    }

    return pass();
  }

  private findLeakHash(response: object): string | undefined {
    const serialized = JSON.stringify(response);
    if (serialized === undefined) {
      return hashResponseLeak("unserializable");
    }

    for (const pattern of RESPONSE_LEAK_PATTERNS) {
      if (pattern.test(serialized)) {
        return hashResponseLeak(serialized);
      }
    }

    return undefined;
  }
}

function pass(): MirrorComparison {
  return {
    control: "PASS",
    matchesExpectation: true,
    reason: "matched",
  };
}

function block(reason: MirrorComparison["reason"]): MirrorComparison {
  return {
    control: "BLOCK",
    matchesExpectation: false,
    reason,
  };
}

function hashResponseLeak(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
