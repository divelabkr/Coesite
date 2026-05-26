import { Injectable } from "@nestjs/common";

export interface TrustDecayInput {
  readonly baseline: number;
  readonly lastActiveAt: Date;
  readonly now: Date;
  readonly trustScore: number;
}

export interface TrustRecoveryInput {
  readonly baseline: number;
  readonly trustScore: number;
}

export interface TrustMetabolismResult {
  readonly trustScore: number;
}

@Injectable()
export class TrustMetabolismService {
  decay(input: TrustDecayInput): TrustMetabolismResult {
    const inactiveHours = Math.max(
      0,
      (input.now.getTime() - input.lastActiveAt.getTime()) / 3_600_000,
    );
    const hourlyDecay = 0.01 + 0.03 / (1 + Math.exp(inactiveHours - 12));
    const trustScore = Math.max(
      0,
      input.trustScore * (1 - hourlyDecay * inactiveHours),
    );

    return { trustScore: round(trustScore) };
  }

  recover(input: TrustRecoveryInput): TrustMetabolismResult {
    const recovered = input.trustScore + (input.baseline - input.trustScore) * 0.25;
    return { trustScore: round(Math.min(input.baseline, recovered)) };
  }
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
