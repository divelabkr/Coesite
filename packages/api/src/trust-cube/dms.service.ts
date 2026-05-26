import { Injectable } from "@nestjs/common";

import { WormLogService, type WormLogRecord } from "./worm-log.service";

export interface DmsTriggerInput {
  readonly dryRun: boolean;
  readonly reason: "heartbeat_missed" | "policy_tamper";
}

export interface DmsTriggerResult {
  readonly control: "PASS";
  readonly dryRun: boolean;
  readonly record?: WormLogRecord;
}

@Injectable()
export class DmsService {
  private readonly wormLogService = new WormLogService();

  trigger(input: DmsTriggerInput): DmsTriggerResult {
    const record = this.wormLogService.append({
      level: "WARN",
      message: input.reason,
      source: "dms",
    });

    return {
      control: "PASS",
      dryRun: input.dryRun,
      record,
    };
  }

  verify(): boolean {
    return this.wormLogService.verify();
  }
}

export type IncidentLevel = "CAUTION" | "CRITICAL" | "NORMAL" | "WARNING";

export interface IncidentGovernorResult {
  readonly level: IncidentLevel;
}

@Injectable()
export class IncidentGovernorService {
  evaluate(score: number): IncidentGovernorResult {
    if (score >= 80) {
      return { level: "CRITICAL" };
    }
    if (score >= 60) {
      return { level: "WARNING" };
    }
    if (score >= 30) {
      return { level: "CAUTION" };
    }

    return { level: "NORMAL" };
  }
}
