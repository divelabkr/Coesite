import { describe, expect, it, vi } from "vitest";

import { attachCoesiteGuardReceipt, type CoesiteGuardReceiptPayload } from "@coesite/utils";
import { CoesiteClient } from "../src";
import type {
  CoesiteGuardRequest,
  CoesiteGuardResponse,
  CoesiteProofBundleView,
} from "@coesite/types";

const RESPONSE_KEY = "test-response-key";

const request: CoesiteGuardRequest = {
  action: "read",
  requestId: "req-1",
  resource: "doc-1",
  subjectRef: "agent-1",
};

describe("CoesiteClient", () => {
  it("returns a guard response from the API", async () => {
    const apiResponse = signedResponse({
      control: "BLOCK",
      evidence: [{ kind: "trace", ref: "trace-1" }],
      requestId: "req-1",
      signals: {
        confidence: 1,
        flags: ["phase_not_ready"],
        riskScore: 100,
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => apiResponse,
      ok: true,
    });
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      baseUrl: "https://api.example.test/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.verifyGuard(request)).resolves.toEqual(apiResponse);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/guard/verify",
      expect.objectContaining({
        headers: {
          authorization: "Bearer test-api-key",
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("accepts a validated PROCEED response from the runtime gate", async () => {
    const apiResponse = signedResponse({
      control: "PROCEED",
      evidence: [{ kind: "trace", ref: "trace-1" }],
      requestId: "req-1",
      signals: {
        confidence: 1,
        flags: ["guard_passed"],
        riskScore: 0,
      },
    });
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      baseUrl: "https://api.example.test",
      fetchImpl: vi.fn().mockResolvedValue({
        json: async () => apiResponse,
        ok: true,
      }) as unknown as typeof fetch,
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.verifyGuard(request)).resolves.toEqual(apiResponse);
  });

  it("fails closed on network errors", async () => {
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      baseUrl: "https://api.example.test",
      fetchImpl: vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch,
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.verifyGuard(request)).resolves.toMatchObject({
      control: "BLOCK",
      requestId: "req-1",
      signals: {
        flags: ["sdk_fail_closed"],
        riskScore: 100,
      },
    });
  });

  it("fails closed when a successful response has an invalid shape", async () => {
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      baseUrl: "https://api.example.test",
      fetchImpl: vi.fn().mockResolvedValue({
        json: async () => ({
          control: "PROCEED",
          requestId: "req-1",
        }),
        ok: true,
      }) as unknown as typeof fetch,
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.verifyGuard(request)).resolves.toMatchObject({
      control: "BLOCK",
      requestId: "req-1",
      signals: {
        flags: ["invalid_response_shape"],
        riskScore: 100,
      },
    });
  });

  it("fails closed when a successful response has an invalid receipt", async () => {
    const apiResponse = {
      ...signedResponse({
        control: "PROCEED",
        evidence: [{ kind: "trace", ref: "trace-1" }],
        requestId: "req-1",
        signals: {
          confidence: 1,
          flags: ["guard_passed"],
          riskScore: 0,
        },
      }),
      control: "BLOCK" as const,
    };
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      baseUrl: "https://api.example.test",
      fetchImpl: vi.fn().mockResolvedValue({
        json: async () => apiResponse,
        ok: true,
      }) as unknown as typeof fetch,
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.verifyGuard(request)).resolves.toMatchObject({
      control: "BLOCK",
      requestId: "req-1",
      signals: {
        flags: ["invalid_response_receipt"],
        riskScore: 100,
      },
    });
  });

  it("fetches a RedGate proof bundle when an audit key is configured", async () => {
    const proof = proofBundleView();
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => proof,
      ok: true,
    });
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      auditKey: "audit-key",
      baseUrl: "https://api.example.test/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.getProofBundle("req-1")).resolves.toEqual(proof);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/redgate/proofs/req-1",
      {
        headers: { authorization: "Bearer audit-key" },
        method: "GET",
      },
    );
  });

  it("returns undefined when RedGate proof retrieval fails", async () => {
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      auditKey: "audit-key",
      baseUrl: "https://api.example.test",
      fetchImpl: vi.fn().mockResolvedValue({
        json: async () => ({ requestId: "req-1" }),
        ok: true,
      }) as unknown as typeof fetch,
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.getProofBundle("req-1")).resolves.toBeUndefined();
  });

  it("requires an audit key before RedGate proof retrieval", async () => {
    const client = new CoesiteClient({
      apiKey: "test-api-key",
      baseUrl: "https://api.example.test",
      responseVerificationKey: RESPONSE_KEY,
    });

    await expect(client.getProofBundle("req-1")).rejects.toThrow(
      "coesite_audit_key_required",
    );
  });

  it("requires an API key at construction time", () => {
    expect(
      () =>
        new CoesiteClient({
          apiKey: " ",
          baseUrl: "https://api.example.test",
          responseVerificationKey: RESPONSE_KEY,
        }),
    ).toThrow("coesite_api_key_required");
  });

  it("requires a response verification key at construction time", () => {
    expect(
      () =>
        new CoesiteClient({
          apiKey: "test-api-key",
          baseUrl: "https://api.example.test",
          responseVerificationKey: " ",
        }),
    ).toThrow("coesite_response_verification_key_required");
  });
});

function signedResponse(payload: CoesiteGuardReceiptPayload): CoesiteGuardResponse {
  return attachCoesiteGuardReceipt(payload, RESPONSE_KEY, {
    issuedAt: "2026-05-26T00:00:00.000Z",
  });
}

function proofBundleView(): CoesiteProofBundleView {
  return {
    action: "read",
    bundleId: "a".repeat(64),
    contractHash: "b".repeat(64),
    control: "PROCEED",
    createdAt: "2026-05-26T00:00:00.000Z",
    evidence: [{ kind: "trace", refHash: "c".repeat(64) }],
    hash: "d".repeat(64),
    policyVersion: "policy:1",
    prevHash: "GENESIS",
    receiptPayloadHash: "e".repeat(64),
    requestId: "req-1",
    resourceHash: "f".repeat(64),
    runtimeVersion: "runtime-1",
    subjectRefHash: "0".repeat(64),
  };
}
