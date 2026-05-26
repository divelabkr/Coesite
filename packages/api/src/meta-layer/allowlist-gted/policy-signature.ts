import { createHmac, timingSafeEqual } from "node:crypto";

import type { SignedAllowListPolicy, UnsignedAllowListPolicy } from "./types";

const HMAC_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;

type SignablePolicy = UnsignedAllowListPolicy | SignedAllowListPolicy;

export function createSignedAllowListPolicy(
  policy: UnsignedAllowListPolicy,
  keyId: string,
  hmacKey: string,
): SignedAllowListPolicy {
  const unsignedPolicy: UnsignedAllowListPolicy = {
    ...policy,
    keyId,
    signature: undefined,
  };

  return {
    ...policy,
    keyId,
    signature: signAllowListPolicy(unsignedPolicy, hmacKey),
  };
}

export function signAllowListPolicy(
  policy: SignablePolicy,
  hmacKey: string,
): string {
  return createHmac("sha256", hmacKey)
    .update(canonicalizePolicyForSignature(policy))
    .digest("hex");
}

export function verifyAllowListPolicySignature(
  policy: SignedAllowListPolicy,
  hmacKey: string,
): boolean {
  if (!HMAC_SHA256_HEX_PATTERN.test(policy.signature)) {
    return false;
  }

  const expected = Buffer.from(signAllowListPolicy(policy, hmacKey), "hex");
  const actual = Buffer.from(policy.signature, "hex");

  return (
    expected.byteLength === actual.byteLength && timingSafeEqual(expected, actual)
  );
}

function canonicalizePolicyForSignature(policy: SignablePolicy): string {
  return JSON.stringify({
    allowList: policy.allowList,
    expiresAt: policy.expiresAt,
    gtedThreshold: policy.gtedThreshold,
    issuedAt: policy.issuedAt,
    keyId: policy.keyId,
    policyId: policy.policyId,
    version: policy.version,
  });
}
