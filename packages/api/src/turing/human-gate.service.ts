import { Inject, Injectable, Optional } from "@nestjs/common";

export const TURING_OPTIONS = Symbol("TURING_OPTIONS");

export interface HumanGateOptions {
  readonly fatigueThreshold?: number;
  readonly fatigueWindowMs?: number;
  readonly now?: () => Date;
}

export interface HumanGateRequestInput {
  readonly action: string;
  readonly expiresAt: Date;
  readonly requestId: string;
  readonly requiredPeers: number;
}

export interface HumanGateResult {
  readonly control: "DENY" | "OBSERVE" | "PASS" | "PENDING";
  readonly reason?:
    | "bioauth_failed"
    | "channel_not_separated"
    | "expired_request"
    | "fatigue_pattern"
    | "not_found"
    | "waiting_for_peer";
  readonly status?: "QUORUM_MET";
}

export interface ChannelSeparationInput {
  readonly agentToolNames: readonly string[];
  readonly humanGateEndpoint: string;
}

interface HumanGateState {
  readonly expiresAt: Date;
  readonly requiredPeers: number;
  readonly humans: Set<string>;
}

@Injectable()
export class HumanGateService {
  private readonly fatigueThreshold: number;
  private readonly fatigueWindowMs: number;
  private readonly now: () => Date;
  private readonly requests = new Map<string, HumanGateState>();
  private readonly humanActionTimes = new Map<string, number[]>();

  constructor(
    @Optional()
    @Inject(TURING_OPTIONS)
    options: HumanGateOptions = {},
  ) {
    this.fatigueThreshold = options.fatigueThreshold ?? 10;
    this.fatigueWindowMs = options.fatigueWindowMs ?? 300_000;
    this.now = options.now ?? (() => new Date());
  }

  createRequest(input: HumanGateRequestInput): HumanGateResult {
    this.requests.set(input.requestId, {
      expiresAt: input.expiresAt,
      humans: new Set<string>(),
      requiredPeers: Math.max(1, input.requiredPeers),
    });

    return {
      control: "PENDING",
      reason: "waiting_for_peer",
    };
  }

  attest(
    requestId: string,
    humanRef: string,
    bioAuthPassed: boolean,
  ): HumanGateResult {
    const request = this.requests.get(requestId);
    if (request === undefined) {
      return {
        control: "DENY",
        reason: "not_found",
      };
    }

    if (request.expiresAt.getTime() <= this.now().getTime()) {
      return {
        control: "DENY",
        reason: "expired_request",
      };
    }

    if (!bioAuthPassed) {
      return {
        control: "DENY",
        reason: "bioauth_failed",
      };
    }

    request.humans.add(humanRef);
    if (request.humans.size >= request.requiredPeers) {
      return {
        control: "PASS",
        status: "QUORUM_MET",
      };
    }

    return {
      control: "PENDING",
      reason: "waiting_for_peer",
    };
  }

  recordHumanAction(humanRef: string, at: Date = this.now()): HumanGateResult {
    const timestamp = at.getTime();
    const retained = (this.humanActionTimes.get(humanRef) ?? []).filter(
      (eventAt) => timestamp - eventAt <= this.fatigueWindowMs,
    );
    retained.push(timestamp);
    this.humanActionTimes.set(humanRef, retained);

    if (retained.length > this.fatigueThreshold) {
      return {
        control: "OBSERVE",
        reason: "fatigue_pattern",
      };
    }

    return {
      control: "PASS",
    };
  }

  assertSeparatedChannels(input: ChannelSeparationInput): HumanGateResult {
    const hasHumanGateTool = input.agentToolNames.some((name) =>
      name.toLowerCase().replace(/[_\s]/gu, "-").includes("human-gate"),
    );
    if (hasHumanGateTool || input.humanGateEndpoint.trim() === "") {
      return {
        control: "DENY",
        reason: "channel_not_separated",
      };
    }

    return {
      control: "PASS",
    };
  }
}
