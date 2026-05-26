import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  AllowListPolicyError,
  AllowListPolicyService,
  GtedError,
  GtedService,
  M1GateService,
  M1Guard,
  createSignedAllowListPolicy,
  signAllowListPolicy,
  type AllowListPolicyProvider,
  type SignedAllowListPolicy,
} from "./index";

const HMAC_KEY = "test-hmac-material";
const KEY_ID = "key-1";
const NOW = new Date("2026-05-26T00:00:00.000Z");

function createPolicy(
  overrides: Partial<Omit<SignedAllowListPolicy, "signature" | "keyId">> = {},
): SignedAllowListPolicy {
  return createSignedAllowListPolicy(
    {
      allowList: ["POST /v1/guard/verify", "agent.run", "billing.read"],
      expiresAt: "2026-05-26T01:00:00.000Z",
      gtedThreshold: 1.25,
      issuedAt: "2026-05-25T23:00:00.000Z",
      policyId: "policy-1",
      version: 1,
      ...overrides,
    },
    KEY_ID,
    HMAC_KEY,
  );
}

function createPolicyService(
  policy: SignedAllowListPolicy,
  options: {
    readonly cacheTtlMs?: number;
    readonly now?: () => Date;
    readonly provider?: AllowListPolicyProvider;
  } = {},
): AllowListPolicyService {
  return new AllowListPolicyService({
    cacheTtlMs: options.cacheTtlMs,
    hmacKeys: { [KEY_ID]: HMAC_KEY },
    now: options.now ?? (() => NOW),
    policyProvider:
      options.provider ?? {
        loadActivePolicy: vi.fn(async () => policy),
      },
  });
}

async function createM1Service(
  policy = createPolicy(),
): Promise<M1GateService> {
  const service = new M1GateService(createPolicyService(policy), new GtedService());
  await service.evaluateToken("agent.run");
  return service;
}

describe("AllowListPolicyService regression gates", () => {
  it("signs a policy deterministically", () => {
    const policy = createPolicy();
    const withoutSignature = { ...policy, signature: undefined };

    expect(signAllowListPolicy(withoutSignature, HMAC_KEY)).toBe(policy.signature);
  });

  it("changes the signature when allowList content changes", () => {
    const policy = createPolicy();
    const changed = {
      ...policy,
      allowList: [...policy.allowList, "admin.delete"],
      signature: undefined,
    };

    expect(signAllowListPolicy(changed, HMAC_KEY)).not.toBe(policy.signature);
  });

  it("verifies a valid policy and canonicalizes entries", async () => {
    const service = createPolicyService(
      createPolicy({ allowList: [" Agent.Run ", "agent.run", "BILLING.READ"] }),
    );

    await expect(service.getVerifiedPolicy()).resolves.toMatchObject({
      allowList: ["agent.run", "billing.read"],
      policyId: "policy-1",
      version: 1,
    });
  });

  it("rejects a mutated signed policy", async () => {
    const policy = {
      ...createPolicy(),
      allowList: ["POST /v1/guard/verify", "agent.run", "admin.delete"],
    };
    const service = createPolicyService(policy);

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "invalid_signature",
    });
  });

  it("rejects unknown signing key ids", async () => {
    const policy = { ...createPolicy(), keyId: "missing-key" };
    const service = createPolicyService(policy);

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "unknown_key",
    });
  });

  it("rejects expired policies", async () => {
    const service = createPolicyService(
      createPolicy({ expiresAt: "2026-05-25T23:59:59.000Z" }),
    );

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "expired_policy",
    });
  });

  it("rejects policies issued in the future", async () => {
    const service = createPolicyService(
      createPolicy({ issuedAt: "2026-05-26T00:00:01.000Z" }),
    );

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "future_policy",
    });
  });

  it("rejects empty allowLists", async () => {
    const service = createPolicyService(createPolicy({ allowList: [] }));

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "empty_allowlist",
    });
  });

  it("rejects oversized allowLists", async () => {
    const policy = createPolicy({
      allowList: Array.from({ length: 4 }, (_value, index) => `token.${index}`),
    });
    const service = new AllowListPolicyService({
      hmacKeys: { [KEY_ID]: HMAC_KEY },
      maxEntries: 3,
      now: () => NOW,
      policyProvider: { loadActivePolicy: vi.fn(async () => policy) },
    });

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "allowlist_too_large",
    });
  });

  it("rejects blank entries", async () => {
    const service = createPolicyService(createPolicy({ allowList: ["agent.run", " "] }));

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "invalid_allowlist_entry",
    });
  });

  it("uses the verified policy cache before TTL expiry", async () => {
    const provider = { loadActivePolicy: vi.fn(async () => createPolicy()) };
    const service = createPolicyService(createPolicy(), {
      cacheTtlMs: 300_000,
      provider,
    });

    await service.getVerifiedPolicy();
    await service.getVerifiedPolicy();

    expect(provider.loadActivePolicy).toHaveBeenCalledOnce();
  });

  it("reloads policy after TTL expiry", async () => {
    let now = NOW.getTime();
    const provider = { loadActivePolicy: vi.fn(async () => createPolicy()) };
    const service = createPolicyService(createPolicy(), {
      cacheTtlMs: 10,
      now: () => new Date(now),
      provider,
    });

    await service.getVerifiedPolicy();
    now += 11;
    await service.getVerifiedPolicy();

    expect(provider.loadActivePolicy).toHaveBeenCalledTimes(2);
  });

  it("does not serve a cached policy after policy expiry", async () => {
    let now = NOW.getTime();
    const provider = {
      loadActivePolicy: vi.fn(async () =>
        createPolicy({ expiresAt: "2026-05-26T00:00:01.000Z" }),
      ),
    };
    const service = createPolicyService(createPolicy(), {
      cacheTtlMs: 300_000,
      now: () => new Date(now),
      provider,
    });

    await service.getVerifiedPolicy();
    now += 1_001;

    await expect(service.getVerifiedPolicy()).rejects.toBeInstanceOf(
      AllowListPolicyError,
    );
  });

  it("fails closed when the policy provider throws", async () => {
    const service = new AllowListPolicyService({
      hmacKeys: { [KEY_ID]: HMAC_KEY },
      now: () => NOW,
      policyProvider: {
        loadActivePolicy: vi.fn(async () => {
          throw new Error("provider unavailable");
        }),
      },
    });

    await expect(service.getVerifiedPolicy()).rejects.toMatchObject({
      reason: "provider_unavailable",
    });
  });
});

describe("GtedService regression gates", () => {
  const service = new GtedService();

  it("returns zero distance for exact tokens", () => {
    expect(service.distance("agent.run", "agent.run")).toBe(0);
  });

  it("counts insertions", () => {
    expect(service.distance("agent.run", "agent.runn")).toBe(1);
  });

  it("counts deletions", () => {
    expect(service.distance("agent.run", "agent.ru")).toBe(1);
  });

  it("discounts keyboard-neighbor substitutions", () => {
    expect(service.distance("agent.run", "agent.eun")).toBeLessThan(1);
  });

  it("discounts common visual substitutions", () => {
    expect(service.distance("billing.read", "bi11ing.read")).toBeLessThan(2);
  });

  it("discounts adjacent transpositions", () => {
    expect(service.distance("agent.run", "agnet.run")).toBeLessThan(2);
  });

  it("returns the closest allowList entry", () => {
    expect(
      service.minDistance("agent.rum", ["billing.read", "agent.run"]),
    ).toMatchObject({
      distance: expect.any(Number),
      token: "agent.run",
    });
  });

  it("rejects oversized candidates", () => {
    expect(() => service.distance("x".repeat(129), "agent.run")).toThrow(
      GtedError,
    );
  });

  it("rejects oversized allowList comparisons", () => {
    expect(() =>
      service.minDistance(
        "agent.run",
        Array.from({ length: 513 }, (_value, index) => `token.${index}`),
      ),
    ).toThrow(GtedError);
  });
});

describe("M1GateService regression gates", () => {
  it("passes exact allowList matches", async () => {
    const service = await createM1Service();

    await expect(service.evaluateToken("agent.run")).resolves.toMatchObject({
      control: "PASS",
      reason: "allowlist_exact_match",
    });
  });

  it("passes canonical case-insensitive matches", async () => {
    const service = await createM1Service();

    await expect(service.evaluateToken(" Agent.Run ")).resolves.toMatchObject({
      control: "PASS",
      normalizedToken: "agent.run",
    });
  });

  it("marks near allowList variants for SIREN handoff", async () => {
    const service = await createM1Service();

    await expect(service.evaluateToken("agent.rum")).resolves.toMatchObject({
      control: "OBSERVE",
      handoff: "SIREN",
      reason: "near_allowlist_variant",
    });
  });

  it("blocks far tokens", async () => {
    const service = await createM1Service();

    await expect(service.evaluateToken("admin.delete")).resolves.toMatchObject({
      control: "BLOCK",
      reason: "not_in_allowlist",
    });
  });

  it("blocks tokens longer than the GTED bound", async () => {
    const service = await createM1Service();

    await expect(service.evaluateToken("x".repeat(129))).resolves.toMatchObject({
      control: "BLOCK",
      reason: "gted_input_rejected",
    });
  });

  it("blocks when policy verification is unavailable", async () => {
    const policyService = new AllowListPolicyService({
      hmacKeys: { [KEY_ID]: HMAC_KEY },
      now: () => NOW,
      policyProvider: {
        loadActivePolicy: vi.fn(async () => {
          throw new Error("offline");
        }),
      },
    });
    const service = new M1GateService(policyService, new GtedService());

    await expect(service.evaluateToken("agent.run")).resolves.toMatchObject({
      control: "BLOCK",
      reason: "policy_unavailable",
    });
  });
});

describe("M1Guard regression gates", () => {
  it("blocks requests without candidate tokens", async () => {
    const service = await createM1Service();
    const guard = new M1Guard(service);
    const context = createHttpContext({ body: {}, headers: {}, method: "POST" });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("attaches metadata for pass requests", async () => {
    const service = await createM1Service();
    const guard = new M1Guard(service);
    const request = {
      body: { action: "agent.run" },
      headers: {},
      method: "POST",
    };

    await expect(guard.canActivate(createHttpContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      m1GtedMetadata: {
        blocked: false,
        control: "PASS",
      },
    });
  });

  it("throws on blocked request tokens", async () => {
    const service = await createM1Service();
    const guard = new M1Guard(service);

    await expect(
      guard.canActivate(
        createHttpContext({
          body: { action: "admin.delete" },
          headers: {},
          method: "POST",
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lets SIREN handoff requests continue with explicit metadata", async () => {
    const service = await createM1Service();
    const guard = new M1Guard(service);
    const request = {
      body: { action: "agent.rum" },
      headers: {},
      method: "POST",
    };

    await expect(guard.canActivate(createHttpContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      m1GtedMetadata: {
        blocked: false,
        control: "OBSERVE",
        handoff: "SIREN",
      },
    });
  });
});

function createHttpContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}
