import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoesiteGuardResponse } from "@coesite/types";
import { attachCoesiteGuardReceipt, buildWormAppendEnvelope } from "@coesite/utils";

import { ProofBundleService } from "./proof-bundle.service";
import type { ProofBundleRecord } from "./proof-bundle.service";
import { ReleaseContractService } from "./release-contract.service";

const RESPONSE_KEY = "proof-test-response-key";

describe("ProofBundleService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records signed guard responses as an intact ProofBundle chain", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const service = createService();

    const first = service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });
    const second = service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-2",
      response: signedResponse("req-2"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });

    expect(first.prevHash).toBe("GENESIS");
    expect(second.prevHash).toBe(first.hash);
    expect(service.verify()).toBe(true);
    expect(service.findByRequestId("req-1")?.hash).toBe(first.hash);
    expect(first.subjectRefHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.resourceHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.partition.value).toBe(first.subjectRefHash);
    expect(JSON.stringify(first)).not.toContain("agent-1");
    expect(JSON.stringify(first)).not.toContain("doc-1");
  });

  it("rejects duplicate requestId values to prevent audit ambiguity", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const service = createService();

    service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });

    expect(() =>
      service.recordGuardDecision({
        action: "read",
        policyVersion: "policy:1",
        resource: "doc-2",
        response: signedResponse("req-1"),
        runtimeVersion: "runtime-1",
        subjectRef: "agent-2",
      }),
    ).toThrow("proof_bundle_duplicate_request_id");
  });

  it("fails closed when a guard receipt is tampered", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const service = createService();
    const response = {
      ...signedResponse("req-1"),
      control: "BLOCK",
    } satisfies CoesiteGuardResponse;

    expect(() =>
      service.recordGuardDecision({
        action: "read",
        policyVersion: "policy:1",
        resource: "doc-1",
        response,
        runtimeVersion: "runtime-1",
        subjectRef: "agent-1",
      }),
    ).toThrow("release_contract_failed:receipt_invalid");
  });

  it("writes each bundle to the configured append path", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-proof-")), "proof.jsonl");
    vi.stubEnv("COESITE_PROOF_BUNDLE_APPEND_PATH", appendPath);
    const service = createService();

    const record = service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });

    const lines = readFileSync(appendPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]) as unknown).toMatchObject({
      hash: record.hash,
      requestId: "req-1",
    });
    expect(lines[0]).not.toContain("agent-1");
    expect(lines[0]).not.toContain("doc-1");
  });

  it("loads existing append records on restart and preserves replay protection", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-proof-")), "proof.jsonl");
    vi.stubEnv("COESITE_PROOF_BUNDLE_APPEND_PATH", appendPath);
    const service = createService();
    const record = service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });

    const restarted = createService();

    expect(restarted.findByRequestId("req-1")?.hash).toBe(record.hash);
    expect(() =>
      restarted.recordGuardDecision({
        action: "read",
        policyVersion: "policy:1",
        resource: "doc-2",
        response: signedResponse("req-1"),
        runtimeVersion: "runtime-1",
        subjectRef: "agent-2",
      }),
    ).toThrow("proof_bundle_duplicate_request_id");
  });

  it("reloads durable append state before each write so stale workers cannot fork chains", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-proof-")), "proof.jsonl");
    vi.stubEnv("COESITE_PROOF_BUNDLE_APPEND_PATH", appendPath);
    const active = createService();
    const stale = createService();
    const first = active.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });

    const second = stale.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-2",
      response: signedResponse("req-2"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-2",
    });
    const restarted = createService();

    expect(second.prevHash).toBe(first.hash);
    expect(restarted.verify()).toBe(true);
    expect(restarted.list()).toHaveLength(2);
  });

  it("fails closed when an existing append log has been tampered", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const appendPath = join(mkdtempSync(join(tmpdir(), "coesite-proof-")), "proof.jsonl");
    vi.stubEnv("COESITE_PROOF_BUNDLE_APPEND_PATH", appendPath);
    const service = createService();
    service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });
    const tampered = readFileSync(appendPath, "utf8").replace('"control":"PROCEED"', '"control":"BLOCK"');
    writeFileSync(appendPath, tampered, "utf8");

    expect(() => createService()).toThrow("proof_bundle_append_log_invalid");
  });

  it("detects tampered chain records", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const service = createService();
    const record = service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });

    expect(service.verify([{ ...record, action: "write" }])).toBe(false);
  });

  it("rejects hash-valid duplicate requestId records during chain verification", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const service = createService();
    const first = service.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: signedResponse("req-1"),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });
    const duplicate = createHashValidDuplicateRequestRecord(first);

    expect(service.verify([first, duplicate])).toBe(false);
  });
});

function createService(): ProofBundleService {
  return new ProofBundleService(new ReleaseContractService());
}

function signedResponse(requestId: string): CoesiteGuardResponse {
  return attachCoesiteGuardReceipt(
    {
      control: "PROCEED",
      evidence: [
        { kind: "trace", ref: `trace-${requestId}` },
        { kind: "policy", ref: "policy:1" },
      ],
      requestId,
      signals: {
        confidence: 1,
        flags: ["guard_passed"],
        riskScore: 0,
      },
    },
    RESPONSE_KEY,
    { issuedAt: "2026-05-26T00:00:00.000Z" },
  );
}

function createHashValidDuplicateRequestRecord(
  previous: ProofBundleRecord,
): ProofBundleRecord {
  const createdAt = "2026-05-26T00:00:01.000Z";
  const recordBase = {
    ...previous,
    bundleId: createDigest({
      contractHash: previous.contractHash,
      createdAt,
      requestId: previous.requestId,
    }),
    createdAt,
    prevHash: previous.hash,
    resourceHash: createDigest("doc-duplicate"),
  };
  const envelope = buildWormAppendEnvelope({
    createdAt,
    fields: {
      action: recordBase.action,
      bundleId: recordBase.bundleId,
      contractHash: recordBase.contractHash,
      control: recordBase.control,
      evidence: recordBase.evidence,
      policyVersion: recordBase.policyVersion,
      receiptPayloadHash: recordBase.receiptPayloadHash,
      requestId: recordBase.requestId,
      resourceHash: recordBase.resourceHash,
      runtimeVersion: recordBase.runtimeVersion,
      subjectRefHash: recordBase.subjectRefHash,
    },
    partition: recordBase.partition,
    prevHash: recordBase.prevHash,
    table: "ProofBundle",
  });

  return { ...recordBase, hash: envelope.hash };
}

function createDigest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
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

  return String(value);
}
