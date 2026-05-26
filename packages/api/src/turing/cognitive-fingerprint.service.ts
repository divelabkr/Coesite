import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";

export interface CognitiveFingerprintInput {
  readonly agentId: string;
  readonly requestIntervalsMs: readonly number[];
  readonly responseCodes: readonly number[];
  readonly tokenCounts: readonly number[];
}

export interface CognitiveFingerprint {
  readonly agentId: string;
  readonly fingerprintHash: string;
  readonly featureVector: Readonly<Record<string, number>>;
}

export interface CognitiveFingerprintMatch {
  readonly control: "PASS" | "OBSERVE";
  readonly status: "MATCH" | "MISMATCH" | "NEW_BASELINE";
  readonly fingerprint: CognitiveFingerprint;
}

@Injectable()
export class CognitiveFingerprintService {
  private readonly baselines = new Map<string, string>();

  createFingerprint(input: CognitiveFingerprintInput): CognitiveFingerprint {
    const featureVector = {
      intervalMax: max(input.requestIntervalsMs),
      intervalMean: mean(input.requestIntervalsMs),
      response4xxRatio: ratio(input.responseCodes, (code) => code >= 400),
      tokenMax: max(input.tokenCounts),
      tokenMean: mean(input.tokenCounts),
    };

    return {
      agentId: input.agentId,
      featureVector,
      fingerprintHash: createHash("sha256")
        .update(JSON.stringify({ agentId: input.agentId, featureVector }))
        .digest("hex"),
    };
  }

  registerOrMatch(input: CognitiveFingerprintInput): CognitiveFingerprintMatch {
    const fingerprint = this.createFingerprint(input);
    const baseline = this.baselines.get(input.agentId);

    if (baseline === undefined) {
      this.baselines.set(input.agentId, fingerprint.fingerprintHash);
      return {
        control: "PASS",
        fingerprint,
        status: "NEW_BASELINE",
      };
    }

    if (baseline === fingerprint.fingerprintHash) {
      return {
        control: "PASS",
        fingerprint,
        status: "MATCH",
      };
    }

    return {
      control: "OBSERVE",
      fingerprint,
      status: "MISMATCH",
    };
  }
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function max(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.max(...values);
}

function ratio(values: readonly number[], predicate: (value: number) => boolean): number {
  if (values.length === 0) {
    return 0;
  }

  return round(values.filter(predicate).length / values.length);
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
