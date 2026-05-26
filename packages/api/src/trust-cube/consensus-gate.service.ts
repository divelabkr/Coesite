import { Injectable } from "@nestjs/common";

export type ConsensusEngineName =
  | "AnomalyEngine"
  | "ConsensusVoter"
  | "RuleEngine";

export interface ConsensusVote {
  readonly engine: ConsensusEngineName;
  readonly control: "DENY" | "FAULT" | "PASS";
}

export interface ConsensusResult {
  readonly control: "DENY" | "PASS";
  readonly reason?: "engine_fault" | "insufficient_consensus";
  readonly passed: number;
}

@Injectable()
export class ConsensusGateService {
  vote(votes: readonly ConsensusVote[]): ConsensusResult {
    if (votes.some((vote) => vote.control === "FAULT")) {
      return {
        control: "DENY",
        passed: votes.filter((vote) => vote.control === "PASS").length,
        reason: "engine_fault",
      };
    }

    const passed = votes.filter((vote) => vote.control === "PASS").length;
    if (passed >= 2) {
      return { control: "PASS", passed };
    }

    return {
      control: "DENY",
      passed,
      reason: "insufficient_consensus",
    };
  }
}
