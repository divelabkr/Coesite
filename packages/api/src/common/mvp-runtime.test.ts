import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMvpHumanApprovalSignature,
  getMvpAllowedActions,
  getMvpApiCredentials,
  getMvpApiKeys,
  getMvpAppendPath,
  getMvpResponseHmacKey,
  getMvpPolicyHmacKey,
  getMvpRedGateAuditKeys,
  verifyMvpHumanApprovalArtifact,
} from "./mvp-runtime";

describe("mvp runtime configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the guard route in the allowlist even when customer actions are configured", () => {
    vi.stubEnv("COESITE_ALLOWED_ACTIONS", "read");

    expect(getMvpAllowedActions()).toEqual(["read", "POST /v1/guard/verify"]);
  });

  it("fails startup in production when the policy HMAC secret is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COESITE_POLICY_HMAC_KEY", "");

    expect(() => getMvpPolicyHmacKey()).toThrow("COESITE_POLICY_HMAC_KEY_required");
  });

  it("fails startup in production when API keys are missing", () => {
    vi.stubEnv("COESITE_ENV", "staging");
    vi.stubEnv("COESITE_API_KEYS", "");

    expect(() => getMvpApiKeys()).toThrow("COESITE_API_KEYS_required");
  });

  it("fails startup in production when response signing key is missing", () => {
    vi.stubEnv("COESITE_ENV", "production");
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", "");

    expect(() => getMvpResponseHmacKey()).toThrow(
      "COESITE_RESPONSE_HMAC_KEY_required",
    );
  });

  it("fails startup in production when durable append path is missing", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getMvpAppendPath("COESITE_WORM_APPEND_PATH")).toThrow(
      "COESITE_WORM_APPEND_PATH_required",
    );
  });

  it("parses RedGate audit keys", () => {
    vi.stubEnv("COESITE_REDGATE_AUDIT_KEYS", "audit-1,audit-2");

    expect(getMvpRedGateAuditKeys()).toEqual(["audit-1", "audit-2"]);
  });

  it("fails startup in production when RedGate audit keys are missing", () => {
    vi.stubEnv("COESITE_ENV", "production");
    vi.stubEnv("COESITE_REDGATE_AUDIT_KEYS", "");

    expect(() => getMvpRedGateAuditKeys()).toThrow(
      "COESITE_REDGATE_AUDIT_KEYS_required",
    );
  });

  it("parses scoped API key registry entries", () => {
    vi.stubEnv(
      "COESITE_API_KEY_REGISTRY",
      JSON.stringify([
        {
          allowedActions: ["read"],
          key: "scoped-key",
          subjectPrefix: "tenant-1:",
          tenantRef: "tenant-1",
        },
      ]),
    );

    expect(getMvpApiCredentials()).toEqual([
      {
        allowedActions: ["read"],
        key: "scoped-key",
        subjectPrefix: "tenant-1:",
        tenantRef: "tenant-1",
      },
    ]);
  });

  it("verifies signed HumanGate approval artifacts against action and resource", () => {
    vi.stubEnv("COESITE_HUMAN_APPROVAL_HMAC_KEY", "human-approval-key");
    const signatureInput = {
      action: "agent.run",
      approvalId: "approval-1",
      expiresAt: "2026-05-26T01:00:00.000Z",
      humanRefs: ["human-1", "human-2"],
      requestId: "req-1",
      resource: "doc-1",
      subjectRef: "tenant-1:agent-1",
    };
    const signature = createMvpHumanApprovalSignature(
      signatureInput,
      "human-approval-key",
    );

    expect(
      verifyMvpHumanApprovalArtifact({
        action: signatureInput.action,
        artifact: { ...signatureInput, signature },
        now: new Date("2026-05-26T00:00:00.000Z"),
        requestId: signatureInput.requestId,
        resource: signatureInput.resource,
        subjectRef: signatureInput.subjectRef,
      }),
    ).toBe(true);
    expect(
      verifyMvpHumanApprovalArtifact({
        action: signatureInput.action,
        artifact: { ...signatureInput, signature },
        now: new Date("2026-05-26T00:00:00.000Z"),
        requestId: signatureInput.requestId,
        resource: "other-doc",
        subjectRef: signatureInput.subjectRef,
      }),
    ).toBe(false);
  });
});
