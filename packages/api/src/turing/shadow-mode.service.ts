import { Injectable } from "@nestjs/common";

import { createPaddedJsonBody } from "../common/oracle-prevention/size-padding.util";

export interface ShadowModeResult {
  readonly mode: "LIVE" | "SHADOW";
  readonly reason: "score_below_threshold" | "score_threshold_exceeded";
}

export interface ShadowVirtualResponseInput {
  readonly requestId: string;
  readonly reason: string;
}

export interface ShadowVirtualResponse {
  readonly body: string;
  readonly bodyBytes: number;
  readonly control: "SHADOW";
}

@Injectable()
export class ShadowModeService {
  private readonly threshold = 70;

  evaluate(score: number): ShadowModeResult {
    if (score >= this.threshold) {
      return {
        mode: "SHADOW",
        reason: "score_threshold_exceeded",
      };
    }

    return {
      mode: "LIVE",
      reason: "score_below_threshold",
    };
  }

  createVirtualResponse(input: ShadowVirtualResponseInput): ShadowVirtualResponse {
    const body = createPaddedJsonBody({
      control: "SHADOW",
      requestId: input.requestId,
      reason: input.reason,
    });

    return {
      body,
      bodyBytes: Buffer.byteLength(body),
      control: "SHADOW",
    };
  }
}

export type ImmuneOperation = "db_write" | "external_call" | "read_only";

export interface ImmuneIsolationResult {
  readonly control: "DENY" | "PASS";
  readonly reason: "isolated_side_effect" | "read_only_allowed";
}

@Injectable()
export class ImmuneIsolationService {
  authorizeOperation(operation: ImmuneOperation): ImmuneIsolationResult {
    if (operation === "read_only") {
      return {
        control: "PASS",
        reason: "read_only_allowed",
      };
    }

    return {
      control: "DENY",
      reason: "isolated_side_effect",
    };
  }
}
