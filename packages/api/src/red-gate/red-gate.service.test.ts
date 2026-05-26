import { afterEach, describe, expect, it, vi } from "vitest";
import { attachCoesiteGuardReceipt } from "@coesite/utils";

import { ProofBundleService, ReleaseContractService } from "../proof-gate";
import { RedGateService } from "./red-gate.service";

const RESPONSE_KEY = "redgate-test-response-key";

describe("RedGateService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a redacted proof view without internal partition values", () => {
    vi.stubEnv("COESITE_RESPONSE_HMAC_KEY", RESPONSE_KEY);
    const proofBundleService = new ProofBundleService(new ReleaseContractService());
    const redGateService = new RedGateService(proofBundleService);

    const record = proofBundleService.recordGuardDecision({
      action: "read",
      policyVersion: "policy:1",
      resource: "doc-1",
      response: attachCoesiteGuardReceipt(
        {
          control: "PROCEED",
          evidence: [
            { kind: "trace", ref: "trace-1" },
            { kind: "policy", ref: "policy:1" },
          ],
          requestId: "req-1",
          signals: { confidence: 1, flags: ["guard_passed"], riskScore: 0 },
        },
        RESPONSE_KEY,
        { issuedAt: "2026-05-26T00:00:00.000Z" },
      ),
      runtimeVersion: "runtime-1",
      subjectRef: "agent-1",
    });

    const view = redGateService.getProofByRequestId("req-1");

    expect(view).toMatchObject({
      bundleId: record.bundleId,
      hash: record.hash,
      requestId: "req-1",
      subjectRefHash: record.subjectRefHash,
    });
    expect((view as Record<string, unknown> | undefined)?.partition).toBeUndefined();
  });

  it("does not reveal whether an unknown request exists", () => {
    const service = new RedGateService(
      new ProofBundleService(new ReleaseContractService()),
    );

    expect(service.getProofByRequestId("missing")).toBeUndefined();
  });
});
