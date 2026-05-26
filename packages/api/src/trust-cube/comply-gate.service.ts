import { createHmac } from "node:crypto";

import { Inject, Injectable, Optional } from "@nestjs/common";

export const TRUST_CUBE_OPTIONS = Symbol("TRUST_CUBE_OPTIONS");

export interface ComplyGateOptions {
  readonly hmacKey?: string;
  readonly now?: () => Date;
}

export interface ComplyPolicyPayload {
  readonly allowRules: readonly string[];
  readonly expiresAt: string;
  readonly fpvProofHash: string;
  readonly issuedAt: string;
  readonly policyId: string;
  readonly version: number;
}

export interface SignedComplyPolicy extends ComplyPolicyPayload {
  readonly signers: readonly string[];
  readonly signature: string;
}

export interface ComplyGateResult {
  readonly control: "DENY" | "PASS";
  readonly reason?:
    | "dual_sign_missing"
    | "expired_policy"
    | "fpv_missing"
    | "signature_invalid";
}

@Injectable()
export class ComplyGateService {
  private readonly hmacKey: string;
  private readonly now: () => Date;

  constructor(
    @Optional()
    @Inject(TRUST_CUBE_OPTIONS)
    options: ComplyGateOptions = {},
  ) {
    this.hmacKey = options.hmacKey ?? "";
    this.now = options.now ?? (() => new Date());
  }

  evaluate(policy: SignedComplyPolicy): ComplyGateResult {
    if (new Set(policy.signers).size < 2) {
      return { control: "DENY", reason: "dual_sign_missing" };
    }

    if (policy.fpvProofHash.trim() === "") {
      return { control: "DENY", reason: "fpv_missing" };
    }

    if (Date.parse(policy.expiresAt) <= this.now().getTime()) {
      return { control: "DENY", reason: "expired_policy" };
    }

    if (signComplyPolicy(policy, this.hmacKey) !== policy.signature) {
      return { control: "DENY", reason: "signature_invalid" };
    }

    return { control: "PASS" };
  }
}

export function createSignedComplyPolicy(
  payload: ComplyPolicyPayload,
  signers: readonly string[],
  hmacKey: string,
): SignedComplyPolicy {
  const policy = {
    ...payload,
    signers,
    signature: "",
  };

  return {
    ...policy,
    signature: signComplyPolicy(policy, hmacKey),
  };
}

function signComplyPolicy(policy: SignedComplyPolicy, hmacKey: string): string {
  return createHmac("sha256", hmacKey)
    .update(
      JSON.stringify({
        allowRules: policy.allowRules,
        expiresAt: policy.expiresAt,
        fpvProofHash: policy.fpvProofHash,
        issuedAt: policy.issuedAt,
        policyId: policy.policyId,
        signers: policy.signers,
        version: policy.version,
      }),
    )
    .digest("hex");
}
