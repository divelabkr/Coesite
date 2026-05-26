import { Inject, Injectable, Optional } from "@nestjs/common";

import { verifyAllowListPolicySignature } from "./policy-signature";
import {
  ALLOWLIST_GTED_OPTIONS,
  type AllowListGtedOptions,
  type AllowListPolicyFailureReason,
  type SignedAllowListPolicy,
  type VerifiedAllowListPolicy,
} from "./types";

const DEFAULT_CACHE_TTL_MS = 300_000;
const DEFAULT_MAX_ENTRIES = 512;
const DEFAULT_MAX_TOKEN_BYTES = 256;

export class AllowListPolicyError extends Error {
  constructor(
    readonly reason: AllowListPolicyFailureReason,
    message: string = reason,
  ) {
    super(message);
    this.name = "AllowListPolicyError";
  }
}

@Injectable()
export class AllowListPolicyService {
  private readonly cacheTtlMs: number;
  private readonly hmacKeys: Readonly<Record<string, string>>;
  private readonly maxEntries: number;
  private readonly maxTokenBytes: number;
  private readonly now: () => Date;
  private readonly policyProvider?: AllowListGtedOptions["policyProvider"];
  private cachedPolicy?: VerifiedAllowListPolicy;
  private cacheExpiresAtMs = 0;

  constructor(
    @Optional()
    @Inject(ALLOWLIST_GTED_OPTIONS)
    options: AllowListGtedOptions = {},
  ) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.hmacKeys = options.hmacKeys ?? {};
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.maxTokenBytes = options.maxTokenBytes ?? DEFAULT_MAX_TOKEN_BYTES;
    this.now = options.now ?? (() => new Date());
    this.policyProvider = options.policyProvider;
  }

  async getVerifiedPolicy(): Promise<VerifiedAllowListPolicy> {
    const nowMs = this.currentTimeMs();
    if (
      this.cachedPolicy !== undefined &&
      nowMs < this.cacheExpiresAtMs &&
      nowMs < this.cachedPolicy.expiresAtMs
    ) {
      return this.cachedPolicy;
    }

    const rawPolicy = await this.loadPolicy();
    const verifiedPolicy = this.verifyPolicyShape(rawPolicy);
    this.cachedPolicy = verifiedPolicy;
    this.cacheExpiresAtMs = Math.min(
      nowMs + this.cacheTtlMs,
      verifiedPolicy.expiresAtMs,
    );

    return verifiedPolicy;
  }

  private async loadPolicy(): Promise<unknown> {
    if (this.policyProvider === undefined) {
      throw new AllowListPolicyError("provider_unavailable");
    }

    try {
      return await this.policyProvider.loadActivePolicy();
    } catch (error) {
      throw new AllowListPolicyError(
        "provider_unavailable",
        error instanceof Error ? error.message : "provider unavailable",
      );
    }
  }

  private verifyPolicyShape(rawPolicy: unknown): VerifiedAllowListPolicy {
    if (!this.isSignedPolicyShape(rawPolicy)) {
      throw new AllowListPolicyError("invalid_policy_shape");
    }

    const hmacKey = this.hmacKeys[rawPolicy.keyId];
    if (hmacKey === undefined || hmacKey.length === 0) {
      throw new AllowListPolicyError("unknown_key");
    }

    if (!verifyAllowListPolicySignature(rawPolicy, hmacKey)) {
      throw new AllowListPolicyError("invalid_signature");
    }

    const issuedAtMs = Date.parse(rawPolicy.issuedAt);
    const expiresAtMs = Date.parse(rawPolicy.expiresAt);
    if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) {
      throw new AllowListPolicyError("invalid_policy_shape");
    }

    const nowMs = this.currentTimeMs();
    if (issuedAtMs > nowMs) {
      throw new AllowListPolicyError("future_policy");
    }
    if (expiresAtMs <= nowMs || expiresAtMs <= issuedAtMs) {
      throw new AllowListPolicyError("expired_policy");
    }

    if (rawPolicy.allowList.length === 0) {
      throw new AllowListPolicyError("empty_allowlist");
    }
    if (rawPolicy.allowList.length > this.maxEntries) {
      throw new AllowListPolicyError("allowlist_too_large");
    }

    const canonicalEntries = this.canonicalizeEntries(rawPolicy.allowList);
    if (canonicalEntries.length === 0) {
      throw new AllowListPolicyError("empty_allowlist");
    }

    return {
      allowList: canonicalEntries,
      allowSet: new Set(canonicalEntries),
      expiresAt: rawPolicy.expiresAt,
      expiresAtMs,
      gtedThreshold: rawPolicy.gtedThreshold,
      issuedAt: rawPolicy.issuedAt,
      keyId: rawPolicy.keyId,
      policyId: rawPolicy.policyId,
      version: rawPolicy.version,
    };
  }

  private isSignedPolicyShape(value: unknown): value is SignedAllowListPolicy {
    if (value === null || typeof value !== "object") {
      return false;
    }

    const policy = value as Partial<SignedAllowListPolicy>;
    return (
      typeof policy.policyId === "string" &&
      policy.policyId.trim().length > 0 &&
      Number.isInteger(policy.version) &&
      (policy.version ?? 0) > 0 &&
      typeof policy.issuedAt === "string" &&
      typeof policy.expiresAt === "string" &&
      Array.isArray(policy.allowList) &&
      typeof policy.gtedThreshold === "number" &&
      Number.isFinite(policy.gtedThreshold) &&
      policy.gtedThreshold > 0 &&
      policy.gtedThreshold <= 3 &&
      typeof policy.keyId === "string" &&
      policy.keyId.trim().length > 0 &&
      typeof policy.signature === "string"
    );
  }

  private canonicalizeEntries(entries: readonly string[]): readonly string[] {
    const canonicalEntries: string[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      const canonicalEntry = canonicalizeAllowListToken(
        entry,
        this.maxTokenBytes,
      );
      if (!seen.has(canonicalEntry)) {
        seen.add(canonicalEntry);
        canonicalEntries.push(canonicalEntry);
      }
    }

    return canonicalEntries;
  }

  private currentTimeMs(): number {
    const value = this.now().getTime();
    if (!Number.isFinite(value)) {
      throw new AllowListPolicyError("invalid_policy_shape");
    }

    return value;
  }
}

export function canonicalizeAllowListToken(
  token: string,
  maxTokenBytes = DEFAULT_MAX_TOKEN_BYTES,
): string {
  if (typeof token !== "string") {
    throw new AllowListPolicyError("invalid_allowlist_entry");
  }

  const canonicalToken = token.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
  if (
    canonicalToken.length === 0 ||
    Buffer.byteLength(canonicalToken) > maxTokenBytes
  ) {
    throw new AllowListPolicyError("invalid_allowlist_entry");
  }

  return canonicalToken;
}
