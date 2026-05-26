import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import type { CoesiteGuardResponse } from "@coesite/types";
import { verifyCoesiteGuardResponseReceipt } from "@coesite/utils";

import { getMvpResponseHmacKey } from "../common/mvp-runtime";

export interface ReleaseContractInput {
  readonly action: string;
  readonly resource: string;
  readonly response: CoesiteGuardResponse;
  readonly subjectRef: string;
}

export interface ReleaseContractResult {
  readonly contractHash: string;
  readonly control: "DENY" | "PASS";
  readonly reason?:
    | "control_signal_mismatch"
    | "evidence_missing"
    | "receipt_invalid";
}

@Injectable()
export class ReleaseContractService {
  validate(input: ReleaseContractInput): ReleaseContractResult {
    if (!verifyCoesiteGuardResponseReceipt(input.response, getMvpResponseHmacKey())) {
      return deny("receipt_invalid", input);
    }

    const evidenceKinds = new Set(input.response.evidence.map((item) => item.kind));
    if (!evidenceKinds.has("trace") || !evidenceKinds.has("policy")) {
      return deny("evidence_missing", input);
    }

    if (!hasConsistentSignal(input.response)) {
      return deny("control_signal_mismatch", input);
    }

    return {
      contractHash: createContractHash(input),
      control: "PASS",
    };
  }
}

function hasConsistentSignal(response: CoesiteGuardResponse): boolean {
  const flags = new Set(response.signals.flags);
  if (response.control === "PROCEED") {
    return (
      response.signals.riskScore === 0 &&
      flags.has("guard_passed") &&
      !flags.has("guard_blocked")
    );
  }

  return (
    response.signals.riskScore === 100 &&
    flags.has("guard_blocked") &&
    !flags.has("guard_passed")
  );
}

function deny(
  reason: NonNullable<ReleaseContractResult["reason"]>,
  input: ReleaseContractInput,
): ReleaseContractResult {
  return {
    contractHash: createContractHash(input),
    control: "DENY",
    reason,
  };
}

function createContractHash(input: ReleaseContractInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        action: input.action,
        control: input.response.control,
        evidence: input.response.evidence,
        payloadHash: input.response.receipt.payloadHash,
        requestId: input.response.requestId,
        resource: input.resource,
        subjectRef: input.subjectRef,
      }),
    )
    .digest("hex");
}
