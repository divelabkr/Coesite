import { Inject, Injectable } from "@nestjs/common";

import {
  AllowListPolicyError,
  AllowListPolicyService,
  canonicalizeAllowListToken,
} from "./allowlist-policy.service";
import { GtedError, GtedService } from "./gted.service";
import type { M1GateEvaluation, VerifiedAllowListPolicy } from "./types";

type PolicyLookupResult =
  | {
      readonly ok: true;
      readonly policy: VerifiedAllowListPolicy;
    }
  | {
      readonly ok: false;
      readonly evaluation: M1GateEvaluation;
    };

@Injectable()
export class M1GateService {
  constructor(
    @Inject(AllowListPolicyService)
    private readonly allowListPolicyService: AllowListPolicyService,
    @Inject(GtedService)
    private readonly gtedService: GtedService,
  ) {}

  async evaluateToken(token: string): Promise<M1GateEvaluation> {
    let normalizedToken: string;
    try {
      normalizedToken = this.canonicalizeInputToken(token);
    } catch (error) {
      if (error instanceof GtedError) {
        return {
          control: "BLOCK",
          normalizedToken: "",
          reason: "gted_input_rejected",
        };
      }

      throw error;
    }

    const policy = await this.getPolicy(normalizedToken);
    if (!policy.ok) {
      return policy.evaluation;
    }

    if (policy.policy.allowSet.has(normalizedToken)) {
      return {
        control: "PASS",
        normalizedToken,
        policyId: policy.policy.policyId,
        policyVersion: policy.policy.version,
        reason: "allowlist_exact_match",
      };
    }

    try {
      const nearest = this.gtedService.minDistance(
        normalizedToken,
        policy.policy.allowList,
      );

      if (nearest.distance > 0 && nearest.distance <= policy.policy.gtedThreshold) {
        return {
          control: "OBSERVE",
          gtedDistance: nearest.distance,
          handoff: "SIREN",
          nearestAllowListToken: nearest.token,
          normalizedToken,
          policyId: policy.policy.policyId,
          policyVersion: policy.policy.version,
          reason: "near_allowlist_variant",
        };
      }

      return {
        control: "BLOCK",
        gtedDistance: nearest.distance,
        nearestAllowListToken: nearest.token,
        normalizedToken,
        policyId: policy.policy.policyId,
        policyVersion: policy.policy.version,
        reason: "not_in_allowlist",
      };
    } catch (error) {
      if (error instanceof GtedError) {
        return {
          control: "BLOCK",
          normalizedToken,
          reason: "gted_input_rejected",
        };
      }

      throw error;
    }
  }

  private async getPolicy(normalizedToken: string): Promise<PolicyLookupResult> {
    try {
      return {
        ok: true,
        policy: await this.allowListPolicyService.getVerifiedPolicy(),
      };
    } catch (error) {
      const policyFailureReason =
        error instanceof AllowListPolicyError ? error.reason : undefined;
      return {
        evaluation: {
          control: "BLOCK",
          normalizedToken,
          policyFailureReason,
          reason: "policy_unavailable",
        },
        ok: false,
      };
    }
  }

  private canonicalizeInputToken(token: string): string {
    try {
      return canonicalizeAllowListToken(token, 512);
    } catch (_error) {
      throw new GtedError("token_too_large");
    }
  }
}
