import { describe, expect, it } from "vitest";

import {
  WORM_GENESIS_PREV_HASH,
  buildWormAppendEnvelope,
  createWormCanonicalHash,
  verifyWormCanonicalHash,
  type WormCanonicalInput,
} from "../src";

const createdAt = "2026-05-26T00:00:00.000Z";

function auditInput(fields: Record<string, unknown>): WormCanonicalInput {
  return {
    createdAt,
    fields,
    partition: { field: "agentId", value: "agent-1" },
    prevHash: WORM_GENESIS_PREV_HASH,
    table: "AuditLog",
  };
}

describe("WORM canonical hash", () => {
  it("creates the same digest for semantically identical payloads", () => {
    const left = createWormCanonicalHash(
      auditInput({
        action: "token_norm_reject",
        payload: { b: 2, a: 1 },
      }),
    );
    const right = createWormCanonicalHash(
      auditInput({
        payload: { a: 1, b: 2 },
        action: "token_norm_reject",
      }),
    );

    expect(left).toMatch(/^[a-f0-9]{64}$/u);
    expect(left).toBe(right);
  });

  it("detects payload tampering against the stored hash", () => {
    const input = auditInput({
      action: "token_norm_reject",
      payload: { outcome: "deny" },
    });
    const hash = createWormCanonicalHash(input);
    const tampered = auditInput({
      action: "token_norm_reject",
      payload: { outcome: "allow" },
    });

    expect(verifyWormCanonicalHash(input, hash)).toBe(true);
    expect(verifyWormCanonicalHash(tampered, hash)).toBe(false);
  });

  it.each(["__proto__", "constructor", "prototype"])(
    "binds special payload key %s into the digest",
    (specialKey) => {
      const base = auditInput({
        payload: {
          safe: true,
        },
      });
      const withSpecialKey = auditInput({
        payload: {
          safe: true,
          [specialKey]: "evidence",
        },
      });

      expect(createWormCanonicalHash(withSpecialKey)).not.toBe(
        createWormCanonicalHash(base),
      );
      expect(JSON.stringify(withSpecialKey.fields)).toContain(specialKey);
    },
  );

  it("binds table and chain partition into the digest", () => {
    const hash = createWormCanonicalHash(
      auditInput({
        action: "same",
        payload: { value: 1 },
      }),
    );
    const otherTableHash = createWormCanonicalHash({
      createdAt,
      fields: {
        action: "same",
        payload: { value: 1 },
      },
      partition: { field: "adminId", value: "agent-1" },
      prevHash: WORM_GENESIS_PREV_HASH,
      table: "AdminActionLog",
    });

    expect(hash).not.toBe(otherTableHash);
  });

  it("fails closed on unsupported canonical values", () => {
    expect(() =>
      createWormCanonicalHash(
        auditInput({
          payload: { value: undefined },
        }),
      ),
    ).toThrow("unsupported WORM canonical value");
  });

  it("builds append envelopes with matching canonical hashes", () => {
    const envelope = buildWormAppendEnvelope({
      fields: { action: "append", payload: { value: 1 } },
      partition: { field: "agentId", value: "agent-1" },
      prevHash: WORM_GENESIS_PREV_HASH,
      table: "AuditLog",
      createdAt,
    });

    expect(envelope.hash).toBe(createWormCanonicalHash(envelope));
    expect(verifyWormCanonicalHash(envelope, envelope.hash)).toBe(true);
  });
});
