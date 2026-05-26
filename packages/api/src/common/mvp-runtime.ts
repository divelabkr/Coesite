import {
  createSignedAllowListPolicy,
} from "../meta-layer/allowlist-gted/policy-signature";
import type { AllowListGtedOptions } from "../meta-layer/allowlist-gted/types";
import { createHmac, timingSafeEqual } from "node:crypto";

export const MVP_POLICY_ID = "coesite-mvp-policy";
export const MVP_POLICY_VERSION = 1;
export const MVP_RUNTIME_VERSION = "coesite-runtime-mvp-v1";

const DEFAULT_MVP_ACTIONS = [
  "read",
  "POST /v1/guard/verify",
] as const;
const MVP_GUARD_ROUTE_ACTION = "POST /v1/guard/verify";
const LOCAL_MVP_API_KEY = "coesite-local-api-key";
const LOCAL_MVP_POLICY_HMAC_KEY = "coesite-local-mvp-key";
const LOCAL_MVP_RESPONSE_HMAC_KEY = "coesite-local-response-key";
const LOCAL_MVP_HUMAN_APPROVAL_HMAC_KEY = "coesite-local-human-approval-key";
const LOCAL_MVP_REDGATE_AUDIT_KEY = "coesite-local-audit-key";

export const MVP_DEFAULT_SESSION_BUDGET = 100;
export const MVP_DEFAULT_SESSION_BUDGET_COST = 1;
export const MVP_DEFAULT_BEHAVIOR = {
  requestIntervalsMs: [100],
  responseCodes: [200],
  tokenCounts: [1],
} as const;
export const MVP_DEFAULT_TRUST_BASELINE = 100;
export const MVP_DEFAULT_TRUST_SCORE = 100;

export interface MvpApiCredential {
  readonly allowedActions: readonly string[];
  readonly approverRefs?: readonly string[];
  readonly key: string;
  readonly subjectPrefix?: string;
  readonly tenantRef: string;
}

export interface MvpHumanApprovalArtifact {
  readonly approvalId: string;
  readonly expiresAt: string;
  readonly humanRefs: readonly string[];
  readonly signature: string;
}

export interface MvpHumanApprovalSignatureInput {
  readonly action: string;
  readonly approvalId: string;
  readonly expiresAt: string;
  readonly humanRefs: readonly string[];
  readonly requestId: string;
  readonly resource: string;
  readonly subjectRef: string;
}

export function getMvpPolicyHmacKey(): string {
  const raw = process.env.COESITE_POLICY_HMAC_KEY;
  if (raw !== undefined && raw.trim() !== "") {
    return raw.trim();
  }

  assertNonProductionSecretFallback("COESITE_POLICY_HMAC_KEY");
  return LOCAL_MVP_POLICY_HMAC_KEY;
}

export function getMvpResponseHmacKey(): string {
  const raw = process.env.COESITE_RESPONSE_HMAC_KEY;
  if (raw !== undefined && raw.trim() !== "") {
    return raw.trim();
  }

  assertNonProductionSecretFallback("COESITE_RESPONSE_HMAC_KEY");
  return LOCAL_MVP_RESPONSE_HMAC_KEY;
}

export function getMvpHumanApprovalHmacKey(): string {
  const raw = process.env.COESITE_HUMAN_APPROVAL_HMAC_KEY;
  if (raw !== undefined && raw.trim() !== "") {
    return raw.trim();
  }

  assertNonProductionSecretFallback("COESITE_HUMAN_APPROVAL_HMAC_KEY");
  return LOCAL_MVP_HUMAN_APPROVAL_HMAC_KEY;
}

export function getMvpApiKeys(): readonly string[] {
  return getMvpApiCredentials().map((credential) => credential.key);
}

export function getMvpRedGateAuditKeys(): readonly string[] {
  const keys = parseCsv(process.env.COESITE_REDGATE_AUDIT_KEYS);
  if (keys.length > 0) {
    return keys;
  }

  assertNonProductionSecretFallback("COESITE_REDGATE_AUDIT_KEYS");
  return [LOCAL_MVP_REDGATE_AUDIT_KEY];
}

export function getMvpApiCredentials(): readonly MvpApiCredential[] {
  // Prefer scoped registry entries; CSV keys are local/small-pilot fallback only.
  const registry = parseApiCredentialRegistry(process.env.COESITE_API_KEY_REGISTRY);
  if (registry.length > 0) {
    return registry;
  }

  const keys = parseCsv(process.env.COESITE_API_KEYS);
  if (keys.length > 0) {
    return keys.map((key) => ({
      allowedActions: getMvpAllowedActions(),
      key,
      tenantRef: "mvp-local-tenant",
    }));
  }

  assertNonProductionSecretFallback("COESITE_API_KEYS");
  return [
    {
      allowedActions: getMvpAllowedActions(),
      key: LOCAL_MVP_API_KEY,
      tenantRef: "mvp-local-tenant",
    },
  ];
}

export function getMvpAllowedActions(): readonly string[] {
  const actions = parseCsv(process.env.COESITE_ALLOWED_ACTIONS);
  if (actions.length === 0) {
    return DEFAULT_MVP_ACTIONS;
  }

  return Array.from(new Set([...actions, MVP_GUARD_ROUTE_ACTION]));
}

export function getMvpApproverRefs(): readonly string[] {
  const approvers = parseCsv(process.env.COESITE_APPROVER_REFS);
  return approvers.length >= 2 ? approvers : ["mvp-human-1", "mvp-human-2"];
}

export function getMvpHumanGateActions(): readonly string[] {
  const actions = parseCsv(process.env.COESITE_HUMAN_GATE_ACTIONS);
  return actions.length > 0 ? actions : ["agent.run", "write", "billing.write"];
}

export function createMvpHumanApprovalSignature(
  input: MvpHumanApprovalSignatureInput,
  hmacKey: string,
): string {
  return createHmac("sha256", hmacKey)
    .update(stableStringify(normalizeHumanApprovalInput(input)))
    .digest("hex");
}

export function verifyMvpHumanApprovalArtifact(
  input: Omit<MvpHumanApprovalSignatureInput, "approvalId" | "expiresAt" | "humanRefs"> & {
    readonly artifact: MvpHumanApprovalArtifact;
    readonly now: Date;
  },
): boolean {
  if (Date.parse(input.artifact.expiresAt) <= input.now.getTime()) {
    return false;
  }
  const humanRefs = Array.from(new Set(input.artifact.humanRefs));
  if (humanRefs.length < 2 || humanRefs.includes(input.subjectRef)) {
    return false;
  }

  const expected = createMvpHumanApprovalSignature(
    {
      action: input.action,
      approvalId: input.artifact.approvalId,
      expiresAt: input.artifact.expiresAt,
      humanRefs,
      requestId: input.requestId,
      resource: input.resource,
      subjectRef: input.subjectRef,
    },
    getMvpHumanApprovalHmacKey(),
  );

  return safeEqual(expected, input.artifact.signature);
}

export function isMvpProductionLikeRuntime(): boolean {
  return isProductionLikeRuntime();
}

export function getMvpAppendPath(envName: string): string | undefined {
  const raw = process.env[envName];
  if (raw !== undefined && raw.trim() !== "") {
    return raw.trim();
  }

  assertNonProductionSecretFallback(envName);
  return undefined;
}

export function createMvpAllowListOptions(): AllowListGtedOptions {
  const keyId = "mvp-local-key";
  const hmacKey = getMvpPolicyHmacKey();

  return {
    hmacKeys: { [keyId]: hmacKey },
    policyProvider: {
      loadActivePolicy: () => {
        const now = new Date();
        return createSignedAllowListPolicy(
          {
            allowList: getMvpAllowedActions(),
            expiresAt: new Date(now.getTime() + 300_000).toISOString(),
            gtedThreshold: 1.25,
            issuedAt: new Date(now.getTime() - 1_000).toISOString(),
            policyId: MVP_POLICY_ID,
            version: MVP_POLICY_VERSION,
          },
          keyId,
          hmacKey,
        );
      },
    },
  };
}

function parseCsv(raw: string | undefined): readonly string[] {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseApiCredentialRegistry(
  raw: string | undefined,
): readonly MvpApiCredential[] {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("COESITE_API_KEY_REGISTRY_invalid");
  }

  return parsed.map((item): MvpApiCredential => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("COESITE_API_KEY_REGISTRY_invalid");
    }
    const record = item as Record<string, unknown>;
    const key = readNonEmptyString(record.key, "key");
    const tenantRef = readNonEmptyString(record.tenantRef, "tenantRef");
    const allowedActions = readStringArray(record.allowedActions, "allowedActions");
    const approverRefs =
      record.approverRefs === undefined
        ? undefined
        : readStringArray(record.approverRefs, "approverRefs");
    const subjectPrefix =
      record.subjectPrefix === undefined
        ? undefined
        : readNonEmptyString(record.subjectPrefix, "subjectPrefix");

    return {
      allowedActions,
      approverRefs,
      key,
      subjectPrefix,
      tenantRef,
    };
  });
}

function readNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`COESITE_API_KEY_REGISTRY_${field}_invalid`);
  }

  return value.trim();
}

function readStringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`COESITE_API_KEY_REGISTRY_${field}_invalid`);
  }

  const strings = value.map((item) => readNonEmptyString(item, field));
  return Array.from(new Set(strings));
}

function normalizeHumanApprovalInput(input: MvpHumanApprovalSignatureInput): unknown {
  return {
    action: input.action,
    approvalId: input.approvalId,
    expiresAt: new Date(input.expiresAt).toISOString(),
    humanRefs: [...input.humanRefs],
    requestId: input.requestId,
    resource: input.resource,
    subjectRef: input.subjectRef,
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJsonValue(value));
}

function normalizeJsonValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      normalized[key] = normalizeJsonValue((value as Record<string, unknown>)[key]);
    }
    return normalized;
  }

  throw new Error("unsupported MVP canonical value");
}

function assertNonProductionSecretFallback(name: string): void {
  if (isProductionLikeRuntime()) {
    throw new Error(`${name}_required`);
  }
}

function isProductionLikeRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  const coesiteEnv = process.env.COESITE_ENV?.toLowerCase();
  return (
    nodeEnv === "production" ||
    nodeEnv === "staging" ||
    coesiteEnv === "production" ||
    coesiteEnv === "staging"
  );
}
