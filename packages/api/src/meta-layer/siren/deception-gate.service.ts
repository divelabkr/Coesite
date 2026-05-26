import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { createPaddedJsonBody } from "../../common/oracle-prevention/size-padding.util";
import type { DecoyRequestContext, DecoyResponse, PolyintentResult } from "./types";
import { UtilityInversionService } from "./utility-inversion.service";

const PINGBACK_BASE_URL = "https://invalid.example/siren";
const WATERMARK_ALPHABET = ["\u200B", "\u200C", "\u200D"] as const;

@Injectable()
export class DeceptionGateService {
  constructor(
    @Inject(UtilityInversionService)
    private readonly utilityInversionService: UtilityInversionService,
  ) {}

  shouldDeceive(result: PolyintentResult): boolean {
    return result.route === "DECEPTION_GATE";
  }

  createDecoy(
    result: PolyintentResult,
    context: DecoyRequestContext,
  ): DecoyResponse {
    if (!this.shouldDeceive(result)) {
      throw new Error("decoy requested for non-deception route");
    }

    const utility = this.utilityInversionService.chooseStrategy(result);
    const decoyId = createDecoyId(result, context.requestId, utility.strategy);
    const watermark = createWatermark(decoyId);
    const pingbackUrl = `${PINGBACK_BASE_URL}/${encodeURIComponent(
      context.requestId,
    )}/${decoyId}`;
    const body = createPaddedJsonBody({
      control: "DECEIVE",
      decoyId,
      message: `Request accepted for asynchronous review.${watermark}`,
      pingbackUrl,
    });

    return {
      body,
      bodyBytes: Buffer.byteLength(body),
      control: "DECEIVE",
      decoyId,
      estimatedUtilityBefore: utility.estimatedUtilityBefore,
      expectedUtilityAfter: utility.expectedUtilityAfter,
      headers: {
        "cache-control": "no-store",
        "content-encoding": "identity",
        "content-length": Buffer.byteLength(body).toString(),
        "content-type": "application/json; charset=utf-8",
        "x-coesite-oracle": "uniform-v1",
      },
      pingbackUrl,
      strategy: utility.strategy,
      watermark,
    };
  }
}

function createDecoyId(
  result: PolyintentResult,
  requestId: string,
  strategy: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        categories: result.intents.map((intent) => intent.category),
        requestId,
        strategy,
      }),
    )
    .digest("hex")
    .slice(0, 32);
}

function createWatermark(decoyId: string): string {
  return Array.from(decoyId.slice(0, 12))
    .map((character) => {
      const index = Number.parseInt(character, 16) % WATERMARK_ALPHABET.length;
      return WATERMARK_ALPHABET[index];
    })
    .join("");
}
