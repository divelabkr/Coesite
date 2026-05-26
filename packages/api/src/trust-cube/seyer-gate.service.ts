import { Injectable } from "@nestjs/common";

import {
  ConsensusGateService,
  type ConsensusVote,
} from "./consensus-gate.service";
import { WormLogService } from "./worm-log.service";

export type SeyerStepControl = "DENY" | "PASS";

export interface SeyerGateInput {
  readonly anomaly: SeyerStepControl;
  readonly budget: SeyerStepControl;
  readonly consensusVotes: readonly ConsensusVote[];
  readonly nk: SeyerStepControl;
  readonly oracle: SeyerStepControl;
  readonly policy: SeyerStepControl;
  readonly session: SeyerStepControl;
  readonly sod: SeyerStepControl;
  readonly tokenNorm: SeyerStepControl;
  readonly trust: SeyerStepControl;
}

export interface SeyerGateResult {
  readonly control: "DENY" | "PASS";
  readonly completedSteps: number;
  readonly failedStep?: string;
}

@Injectable()
export class SeyerGateService {
  constructor(
    private readonly consensusGateService: ConsensusGateService,
    private readonly wormLogService: WormLogService,
  ) {}

  evaluate(input: SeyerGateInput): SeyerGateResult {
    const ruleVote = input.consensusVotes.find(
      (vote) => vote.engine === "RuleEngine",
    );
    const steps: readonly (readonly [string, SeyerStepControl])[] = [
      ["TokenNorm", input.tokenNorm],
      ["OraclePrevention", input.oracle],
      ["PolicyGate", input.policy],
      ["SoDGate", input.sod],
      ["RuleEngine", ruleVote?.control === "PASS" ? "PASS" : "DENY"],
      ["AnomalyEngine", input.anomaly],
      ["NKModule", input.nk],
      ["TrustMetabolism", input.trust],
      [
        "SessionBoundary",
        input.session === "PASS" && input.budget === "PASS" ? "PASS" : "DENY",
      ],
    ];

    let completedSteps = 0;
    for (const [name, control] of steps) {
      if (control !== "PASS") {
        this.record("DENY", name);
        return {
          completedSteps,
          control: "DENY",
          failedStep: name,
        };
      }
      completedSteps += 1;
    }

    const consensus = this.consensusGateService.vote(input.consensusVotes);
    if (consensus.control !== "PASS") {
      this.record("DENY", "ConsensusGate");
      return {
        completedSteps,
        control: "DENY",
        failedStep: "ConsensusGate",
      };
    }

    completedSteps += 1;
    this.record("PASS", "SeyerGate");
    return {
      completedSteps,
      control: "PASS",
    };
  }

  private record(control: "DENY" | "PASS", source: string): void {
    this.wormLogService.append({
      level: control === "PASS" ? "INFO" : "WARN",
      message: control,
      source,
    });
  }
}
