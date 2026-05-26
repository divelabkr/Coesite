import { Inject, Injectable, Optional } from "@nestjs/common";

import { TURING_OPTIONS } from "./human-gate.service";

export interface VelocityThrottleLimits {
  readonly tenSeconds?: number;
  readonly oneMinute?: number;
  readonly fiveMinutes?: number;
  readonly oneHour?: number;
}

export interface VelocityThrottleOptions {
  readonly limits?: VelocityThrottleLimits;
}

export interface VelocityThrottleResult {
  readonly control: "DENY" | "PASS" | "WARN";
  readonly reason: "invalid_timestamp" | "limit_exceeded" | "under_limit";
  readonly count: number;
  readonly limit: number;
}

const DEFAULT_LIMITS: Required<VelocityThrottleLimits> = {
  fiveMinutes: 240,
  oneHour: 1_000,
  oneMinute: 60,
  tenSeconds: 20,
};

const WINDOWS_MS: Readonly<Record<keyof Required<VelocityThrottleLimits>, number>> = {
  fiveMinutes: 300_000,
  oneHour: 3_600_000,
  oneMinute: 60_000,
  tenSeconds: 10_000,
};

@Injectable()
export class VelocityThrottleService {
  private readonly limits: Required<VelocityThrottleLimits>;
  private readonly eventsBySubject = new Map<string, number[]>();
  private readonly overflowBySubject = new Map<string, number>();

  constructor(
    @Optional()
    @Inject(TURING_OPTIONS)
    options: VelocityThrottleOptions = {},
  ) {
    this.limits = {
      ...DEFAULT_LIMITS,
      ...options.limits,
    };
  }

  registerHit(subjectRef: string, at: Date = new Date()): VelocityThrottleResult {
    const timestamp = at.getTime();
    if (!Number.isFinite(timestamp)) {
      return {
        control: "DENY",
        count: 0,
        limit: 0,
        reason: "invalid_timestamp",
      };
    }

    const events = this.eventsBySubject.get(subjectRef) ?? [];
    events.push(timestamp);
    const retained = events.filter((eventAt) => timestamp - eventAt <= WINDOWS_MS.oneHour);
    this.eventsBySubject.set(subjectRef, retained);

    const exceeded = this.findExceededWindow(retained, timestamp);
    if (exceeded === undefined) {
      this.overflowBySubject.set(subjectRef, 0);
      return {
        control: "PASS",
        count: retained.length,
        limit: this.limits.oneHour,
        reason: "under_limit",
      };
    }

    const overflowCount = (this.overflowBySubject.get(subjectRef) ?? 0) + 1;
    this.overflowBySubject.set(subjectRef, overflowCount);

    return {
      control: overflowCount >= 2 ? "DENY" : "WARN",
      count: exceeded.count,
      limit: exceeded.limit,
      reason: "limit_exceeded",
    };
  }

  private findExceededWindow(
    events: readonly number[],
    timestamp: number,
  ): { readonly count: number; readonly limit: number } | undefined {
    for (const key of Object.keys(WINDOWS_MS) as (keyof Required<VelocityThrottleLimits>)[]) {
      const count = events.filter((eventAt) => timestamp - eventAt <= WINDOWS_MS[key]).length;
      const limit = this.limits[key];
      if (count > limit) {
        return { count, limit };
      }
    }

    return undefined;
  }
}
