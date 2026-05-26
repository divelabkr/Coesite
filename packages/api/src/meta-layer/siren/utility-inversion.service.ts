import { Injectable } from "@nestjs/common";

import type {
  PolyintentResult,
  SirenIntentCategory,
  UtilityInversionResult,
} from "./types";

const INTENT_UTILITY: Readonly<Record<SirenIntentCategory, number>> = {
  benign_task: 0,
  credential_probe: 100,
  cross_context_reference: 65,
  data_exfiltration: 95,
  policy_bypass: 80,
  prompt_obfuscation: 70,
  role_override: 70,
  tool_injection: 85,
  unsafe_code_execution: 60,
};

@Injectable()
export class UtilityInversionService {
  intentUtility(category: SirenIntentCategory): number {
    return INTENT_UTILITY[category];
  }

  chooseStrategy(result: PolyintentResult): UtilityInversionResult {
    const estimatedUtilityBefore = this.estimateUtility(result);

    if (result.route !== "DECEPTION_GATE") {
      return {
        estimatedUtilityBefore,
        expectedUtilityAfter: estimatedUtilityBefore,
        strategy: "NO_DECOY",
      };
    }

    if (result.intents.length >= 3) {
      return {
        estimatedUtilityBefore,
        expectedUtilityAfter: round(estimatedUtilityBefore * 0.2),
        strategy: "DELAYED_REVIEW",
      };
    }

    if (result.intents[0]?.category === "credential_probe") {
      return {
        estimatedUtilityBefore,
        expectedUtilityAfter: round(estimatedUtilityBefore * 0.1),
        strategy: "LOW_INFORMATION_ACK",
      };
    }

    return {
      estimatedUtilityBefore,
      expectedUtilityAfter: round(estimatedUtilityBefore * 0.25),
      strategy: "NEUTRAL_ACK",
    };
  }

  private estimateUtility(result: PolyintentResult): number {
    return round(
      result.intents.reduce(
        (sum, intent) =>
          sum + intent.probability * this.intentUtility(intent.category),
        0,
      ),
    );
  }
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
