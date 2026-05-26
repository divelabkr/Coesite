import { describe, expect, it } from "vitest";

import {
  attachCoesiteGuardReceipt,
  verifyCoesiteGuardResponseReceipt,
  type CoesiteGuardReceiptPayload,
} from "../src";

const HMAC_KEY = "test-response-hmac-key";

const payload: CoesiteGuardReceiptPayload = {
  control: "PROCEED",
  evidence: [{ kind: "trace", ref: "trace-1" }],
  requestId: "req-1",
  signals: {
    confidence: 1,
    flags: ["guard_passed"],
    riskScore: 0,
  },
};

describe("Coesite guard response receipt", () => {
  it("signs and verifies a guard response payload", () => {
    const response = attachCoesiteGuardReceipt(payload, HMAC_KEY, {
      issuedAt: "2026-05-26T00:00:00.000Z",
    });

    expect(response.receipt.payloadHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(response.receipt.signature).toMatch(/^[a-f0-9]{64}$/u);
    expect(verifyCoesiteGuardResponseReceipt(response, HMAC_KEY)).toBe(true);
  });

  it("detects tampered control signals", () => {
    const response = attachCoesiteGuardReceipt(payload, HMAC_KEY, {
      issuedAt: "2026-05-26T00:00:00.000Z",
    });

    expect(
      verifyCoesiteGuardResponseReceipt(
        {
          ...response,
          control: "BLOCK",
        },
        HMAC_KEY,
      ),
    ).toBe(false);
  });
});
