import { describe, expect, it } from "vitest";

import {
  CognitiveFingerprintService,
  HumanGateService,
  ImmuneIsolationService,
  ProvenanceChainService,
  SessionBudgetService,
  ShadowModeService,
  VelocityThrottleService,
} from "./index";

const NOW = new Date("2026-05-26T00:00:00.000Z");

describe("Phase 2 TB-1 CognitiveFingerprintService", () => {
  const service = new CognitiveFingerprintService();

  it("creates deterministic fingerprints", () => {
    const input = {
      agentId: "agent-1",
      requestIntervalsMs: [100, 120, 140],
      responseCodes: [200, 200, 403],
      tokenCounts: [10, 12, 15],
    };

    expect(service.createFingerprint(input)).toEqual(
      service.createFingerprint(input),
    );
  });

  it("changes fingerprints when behavior changes", () => {
    const base = service.createFingerprint({
      agentId: "agent-1",
      requestIntervalsMs: [100, 120, 140],
      responseCodes: [200, 200, 403],
      tokenCounts: [10, 12, 15],
    });
    const changed = service.createFingerprint({
      agentId: "agent-1",
      requestIntervalsMs: [900, 950, 1000],
      responseCodes: [403, 403, 403],
      tokenCounts: [80, 90, 100],
    });

    expect(changed.fingerprintHash).not.toBe(base.fingerprintHash);
  });

  it("registers a new baseline", () => {
    expect(
      service.registerOrMatch({
        agentId: "agent-1",
        requestIntervalsMs: [100],
        responseCodes: [200],
        tokenCounts: [10],
      }),
    ).toMatchObject({ control: "PASS", status: "NEW_BASELINE" });
  });

  it("matches an existing baseline", () => {
    const input = {
      agentId: "agent-2",
      requestIntervalsMs: [100],
      responseCodes: [200],
      tokenCounts: [10],
    };

    service.registerOrMatch(input);

    expect(service.registerOrMatch(input)).toMatchObject({
      control: "PASS",
      status: "MATCH",
    });
  });

  it("observes baseline mismatch", () => {
    service.registerOrMatch({
      agentId: "agent-3",
      requestIntervalsMs: [100],
      responseCodes: [200],
      tokenCounts: [10],
    });

    expect(
      service.registerOrMatch({
        agentId: "agent-3",
        requestIntervalsMs: [1000],
        responseCodes: [403],
        tokenCounts: [90],
      }),
    ).toMatchObject({ control: "OBSERVE", status: "MISMATCH" });
  });

  it("keeps synthetic collision rate below the configured gate", () => {
    const hashes = new Set<string>();
    for (let index = 0; index < 200; index += 1) {
      hashes.add(
        service.createFingerprint({
          agentId: `agent-${index}`,
          requestIntervalsMs: [100 + index, 120 + index],
          responseCodes: [200, index % 2 === 0 ? 200 : 403],
          tokenCounts: [10 + index],
        }).fingerprintHash,
      );
    }

    expect(hashes.size / 200).toBeGreaterThan(0.999);
  });
});

describe("Phase 2 TB-2 ProvenanceChainService", () => {
  it("uses genesis prevHash for the first record", () => {
    const chain = new ProvenanceChainService();

    expect(
      chain.append({
        agentId: "agent-1",
        payloadHash: "payload-1",
        policyVersion: "policy-1",
        runtimeVersion: "runtime-1",
      }).prevHash,
    ).toBe("GENESIS");
  });

  it("chains subsequent records", () => {
    const chain = new ProvenanceChainService();
    const first = chain.append({
      agentId: "agent-1",
      payloadHash: "payload-1",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });
    const second = chain.append({
      agentId: "agent-1",
      payloadHash: "payload-2",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    expect(second.prevHash).toBe(first.hash);
  });

  it("verifies untampered chains", () => {
    const chain = new ProvenanceChainService();
    chain.append({
      agentId: "agent-1",
      payloadHash: "payload-1",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    expect(chain.verify()).toBe(true);
  });

  it("detects tampered chains", () => {
    const chain = new ProvenanceChainService();
    const record = chain.append({
      agentId: "agent-1",
      payloadHash: "payload-1",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    expect(chain.verify([{ ...record, payloadHash: "changed" }])).toBe(false);
  });

  it("requires consensus on chain break", () => {
    const chain = new ProvenanceChainService();
    const record = chain.append({
      agentId: "agent-1",
      payloadHash: "payload-1",
      policyVersion: "policy-1",
      runtimeVersion: "runtime-1",
    });

    expect(chain.detectBreak([{ ...record, prevHash: "bad" }])).toMatchObject({
      requiresConsensus: true,
    });
  });
});

describe("Phase 2 TB-3 VelocityThrottleService and SessionBudgetService", () => {
  it("passes requests under velocity limits", () => {
    const throttle = new VelocityThrottleService({ limits: { tenSeconds: 3 } });

    expect(throttle.registerHit("agent-1", NOW)).toMatchObject({
      control: "PASS",
    });
  });

  it("warns before final velocity denial", () => {
    const throttle = new VelocityThrottleService({ limits: { tenSeconds: 2 } });
    throttle.registerHit("agent-1", NOW);
    throttle.registerHit("agent-1", new Date(NOW.getTime() + 1));

    expect(throttle.registerHit("agent-1", new Date(NOW.getTime() + 2))).toMatchObject({
      control: "WARN",
    });
  });

  it("denies repeated velocity overflow", () => {
    const throttle = new VelocityThrottleService({ limits: { tenSeconds: 1 } });
    throttle.registerHit("agent-1", NOW);
    throttle.registerHit("agent-1", new Date(NOW.getTime() + 1));

    expect(throttle.registerHit("agent-1", new Date(NOW.getTime() + 2))).toMatchObject({
      control: "DENY",
    });
  });

  it("drops old velocity events outside the window", () => {
    const throttle = new VelocityThrottleService({ limits: { tenSeconds: 1 } });
    throttle.registerHit("agent-1", NOW);

    expect(
      throttle.registerHit("agent-1", new Date(NOW.getTime() + 11_000)),
    ).toMatchObject({ control: "PASS" });
  });

  it("fails closed for invalid velocity timestamps", () => {
    const throttle = new VelocityThrottleService();

    expect(throttle.registerHit("agent-1", new Date("invalid"))).toMatchObject({
      control: "DENY",
      reason: "invalid_timestamp",
    });
  });

  it("consumes session budget", () => {
    const budget = new SessionBudgetService();
    budget.createSession({ budget: 10, expiresAt: new Date(NOW.getTime() + 60_000), sessionId: "s1" });

    expect(budget.consume("s1", 4, NOW)).toMatchObject({
      control: "PASS",
      remaining: 6,
    });
  });

  it("denies exhausted session budget", () => {
    const budget = new SessionBudgetService();
    budget.createSession({ budget: 3, expiresAt: new Date(NOW.getTime() + 60_000), sessionId: "s1" });

    expect(budget.consume("s1", 4, NOW)).toMatchObject({
      control: "DENY",
      reason: "budget_exhausted",
    });
  });

  it("fails closed for missing sessions", () => {
    expect(new SessionBudgetService().consume("missing", 1, NOW)).toMatchObject({
      control: "DENY",
      reason: "missing_session",
    });
  });

  it("fails closed for expired sessions", () => {
    const budget = new SessionBudgetService();
    budget.createSession({ budget: 10, expiresAt: new Date(NOW.getTime() - 1), sessionId: "s1" });

    expect(budget.consume("s1", 1, NOW)).toMatchObject({
      control: "DENY",
      reason: "expired_session",
    });
  });
});

describe("Phase 2 TB-4 ShadowMode and ImmuneIsolation", () => {
  it("activates shadow mode for suspicious scores", () => {
    expect(new ShadowModeService().evaluate(80)).toMatchObject({
      mode: "SHADOW",
    });
  });

  it("keeps normal scores in live mode", () => {
    expect(new ShadowModeService().evaluate(10)).toMatchObject({
      mode: "LIVE",
    });
  });

  it("creates padded virtual responses", () => {
    const response = new ShadowModeService().createVirtualResponse({
      reason: "observe",
      requestId: "req-1",
    });

    expect(response.bodyBytes).toBe(512);
  });

  it("blocks database writes in immune isolation", () => {
    expect(new ImmuneIsolationService().authorizeOperation("db_write")).toMatchObject({
      control: "DENY",
    });
  });

  it("blocks external calls in immune isolation", () => {
    expect(new ImmuneIsolationService().authorizeOperation("external_call")).toMatchObject({
      control: "DENY",
    });
  });

  it("allows read-only operations in immune isolation", () => {
    expect(new ImmuneIsolationService().authorizeOperation("read_only")).toMatchObject({
      control: "PASS",
    });
  });
});

describe("Phase 2 TB-5 HumanGateService", () => {
  it("creates pending human gate requests", () => {
    const gate = new HumanGateService({ now: () => NOW });

    expect(
      gate.createRequest({
        action: "release.preview",
        expiresAt: new Date(NOW.getTime() + 300_000),
        requestId: "hg-1",
        requiredPeers: 2,
      }),
    ).toMatchObject({ control: "PENDING" });
  });

  it("keeps one attestation pending", () => {
    const gate = new HumanGateService({ now: () => NOW });
    gate.createRequest({
      action: "release.preview",
      expiresAt: new Date(NOW.getTime() + 300_000),
      requestId: "hg-1",
      requiredPeers: 2,
    });

    expect(gate.attest("hg-1", "human-1", true)).toMatchObject({
      control: "PENDING",
    });
  });

  it("passes after two distinct human attestations", () => {
    const gate = new HumanGateService({ now: () => NOW });
    gate.createRequest({
      action: "release.preview",
      expiresAt: new Date(NOW.getTime() + 300_000),
      requestId: "hg-1",
      requiredPeers: 2,
    });
    gate.attest("hg-1", "human-1", true);

    expect(gate.attest("hg-1", "human-2", true)).toMatchObject({
      control: "PASS",
      status: "QUORUM_MET",
    });
  });

  it("does not count duplicate human attestations twice", () => {
    const gate = new HumanGateService({ now: () => NOW });
    gate.createRequest({
      action: "release.preview",
      expiresAt: new Date(NOW.getTime() + 300_000),
      requestId: "hg-1",
      requiredPeers: 2,
    });
    gate.attest("hg-1", "human-1", true);

    expect(gate.attest("hg-1", "human-1", true)).toMatchObject({
      control: "PENDING",
    });
  });

  it("denies failed biometric attestation", () => {
    const gate = new HumanGateService({ now: () => NOW });
    gate.createRequest({
      action: "release.preview",
      expiresAt: new Date(NOW.getTime() + 300_000),
      requestId: "hg-1",
      requiredPeers: 2,
    });

    expect(gate.attest("hg-1", "human-1", false)).toMatchObject({
      control: "DENY",
      reason: "bioauth_failed",
    });
  });

  it("denies expired human gate requests", () => {
    const gate = new HumanGateService({ now: () => NOW });
    gate.createRequest({
      action: "release.preview",
      expiresAt: new Date(NOW.getTime() - 1),
      requestId: "hg-1",
      requiredPeers: 2,
    });

    expect(gate.attest("hg-1", "human-1", true)).toMatchObject({
      control: "DENY",
      reason: "expired_request",
    });
  });

  it("observes approval fatigue patterns", () => {
    const gate = new HumanGateService({ fatigueThreshold: 2, now: () => NOW });

    gate.recordHumanAction("human-1", NOW);
    gate.recordHumanAction("human-1", new Date(NOW.getTime() + 1));

    expect(gate.recordHumanAction("human-1", new Date(NOW.getTime() + 2))).toMatchObject({
      control: "OBSERVE",
      reason: "fatigue_pattern",
    });
  });

  it("passes separated channel checks", () => {
    expect(
      new HumanGateService().assertSeparatedChannels({
        agentToolNames: ["readFile", "writeFile"],
        humanGateEndpoint: "https://human.example/approve",
      }),
    ).toMatchObject({ control: "PASS" });
  });

  it("denies channel checks when human gate appears in agent tools", () => {
    expect(
      new HumanGateService().assertSeparatedChannels({
        agentToolNames: ["readFile", "human-gate"],
        humanGateEndpoint: "https://human.example/approve",
      }),
    ).toMatchObject({ control: "DENY" });
  });
});
