export const ALLOWLIST_GTED_OPTIONS = Symbol("ALLOWLIST_GTED_OPTIONS");

export type M1GateControl = "PASS" | "OBSERVE" | "BLOCK";
export type M1GateHandoff = "SIREN";

export type AllowListPolicyFailureReason =
  | "allowlist_too_large"
  | "empty_allowlist"
  | "expired_policy"
  | "future_policy"
  | "invalid_allowlist_entry"
  | "invalid_policy_shape"
  | "invalid_signature"
  | "provider_unavailable"
  | "unknown_key";

export type M1GateReason =
  | "allowlist_exact_match"
  | "gted_input_rejected"
  | "near_allowlist_variant"
  | "no_candidate_tokens"
  | "not_in_allowlist"
  | "policy_unavailable";

export interface SignedAllowListPolicy {
  readonly policyId: string;
  readonly version: number;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly allowList: readonly string[];
  readonly gtedThreshold: number;
  readonly keyId: string;
  readonly signature: string;
}

export type UnsignedAllowListPolicy = Omit<
  SignedAllowListPolicy,
  "keyId" | "signature"
> & {
  readonly keyId?: string;
  readonly signature?: undefined;
};

export interface VerifiedAllowListPolicy {
  readonly policyId: string;
  readonly version: number;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly expiresAtMs: number;
  readonly allowList: readonly string[];
  readonly allowSet: ReadonlySet<string>;
  readonly gtedThreshold: number;
  readonly keyId: string;
}

export interface AllowListPolicyProvider {
  loadActivePolicy(): Promise<unknown> | unknown;
}

export interface AllowListGtedOptions {
  readonly cacheTtlMs?: number;
  readonly hmacKeys?: Readonly<Record<string, string>>;
  readonly maxEntries?: number;
  readonly maxTokenBytes?: number;
  readonly now?: () => Date;
  readonly policyProvider?: AllowListPolicyProvider;
}

export interface GtedOptions {
  readonly maxAllowListEntries?: number;
  readonly maxTokenLength?: number;
}

export interface GtedNearestMatch {
  readonly token: string;
  readonly distance: number;
}

export interface M1GateEvaluation {
  readonly control: M1GateControl;
  readonly reason: M1GateReason;
  readonly normalizedToken: string;
  readonly handoff?: M1GateHandoff;
  readonly policyId?: string;
  readonly policyVersion?: number;
  readonly nearestAllowListToken?: string;
  readonly gtedDistance?: number;
  readonly policyFailureReason?: AllowListPolicyFailureReason;
}

export interface M1GtedMetadata {
  readonly blocked: boolean;
  readonly control: M1GateControl;
  readonly reason: M1GateReason;
  readonly handoff?: M1GateHandoff;
  readonly inspectedAt: string;
  readonly evaluations: readonly M1GateEvaluation[];
}

export interface M1HttpRequest {
  readonly body?: unknown;
  readonly query?: unknown;
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly method?: string;
  readonly originalUrl?: string;
  readonly url?: string;
  m1GtedMetadata?: M1GtedMetadata;
}
