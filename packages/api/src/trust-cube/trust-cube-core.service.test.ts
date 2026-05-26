import { describe, expect, it } from "vitest";

import {
  ComplyGateService,
  ConsensusGateService,
  DmsService,
  IncidentGovernorService,
  LocalKmsAdapter,
  MultiRootService,
  SeyerGateService,
  TrustMetabolismService,
  WormLogService,
  createSignedComplyPolicy,
} from "./index";

const KEY = "test-hmac-material";
const NOW = new Date("2026-05-26T00:00:00.000Z");

describe("Phase 3 L0 MultiRoot", () => {
  it("signs and verifies with local KMS adapters", async () => {
    const adapter = new LocalKmsAdapter("aws", KEY);
    const signature = await adapter.sign("payload");

    await expect(adapter.verify("payload", signature)).resolves.toBe(true);
  });

  it("passes when two of three roots verify", async () => {
    const service = new MultiRootService([
      new LocalKmsAdapter("aws", KEY),
      new LocalKmsAdapter("gcp", KEY),
      new LocalKmsAdapter("azure", "other"),
    ]);
    const signature = await new LocalKmsAdapter("aws", KEY).sign("payload");

    await expect(service.verify("payload", signature)).resolves.toMatchObject({
      control: "PASS",
      passed: 2,
    });
  });

  it("fails closed when fewer than two roots verify", async () => {
    const service = new MultiRootService([
      new LocalKmsAdapter("aws", KEY),
      new LocalKmsAdapter("gcp", "other"),
      new LocalKmsAdapter("azure", "another"),
    ]);
    const signature = await new LocalKmsAdapter("aws", KEY).sign("payload");

    await expect(service.verify("payload", signature)).resolves.toMatchObject({
      control: "DENY",
    });
  });

  it("fails closed when two roots throw", async () => {
    const service = new MultiRootService([
      new LocalKmsAdapter("aws", KEY),
      new LocalKmsAdapter("gcp", KEY, true),
      new LocalKmsAdapter("azure", KEY, true),
    ]);
    const signature = await new LocalKmsAdapter("aws", KEY).sign("payload");

    await expect(service.verify("payload", signature)).resolves.toMatchObject({
      control: "DENY",
      failed: 2,
    });
  });
});

describe("Phase 3 L1 ComplyGate and DMS", () => {
  it("passes valid dual-signed policies", () => {
    const policy = createSignedComplyPolicy(
      {
        allowRules: ["agent.run"],
        expiresAt: "2026-05-26T01:00:00.000Z",
        fpvProofHash: "proof-1",
        issuedAt: "2026-05-25T23:00:00.000Z",
        policyId: "policy-1",
        version: 1,
      },
      ["signer-a", "signer-b"],
      KEY,
    );

    expect(new ComplyGateService({ hmacKey: KEY, now: () => NOW }).evaluate(policy)).toMatchObject({
      control: "PASS",
    });
  });

  it("denies tampered policies", () => {
    const policy = createSignedComplyPolicy(
      {
        allowRules: ["agent.run"],
        expiresAt: "2026-05-26T01:00:00.000Z",
        fpvProofHash: "proof-1",
        issuedAt: "2026-05-25T23:00:00.000Z",
        policyId: "policy-1",
        version: 1,
      },
      ["signer-a", "signer-b"],
      KEY,
    );

    expect(
      new ComplyGateService({ hmacKey: KEY, now: () => NOW }).evaluate({
        ...policy,
        allowRules: ["admin.delete"],
      }),
    ).toMatchObject({ control: "DENY", reason: "signature_invalid" });
  });

  it("denies policies with fewer than two signers", () => {
    const policy = createSignedComplyPolicy(
      {
        allowRules: ["agent.run"],
        expiresAt: "2026-05-26T01:00:00.000Z",
        fpvProofHash: "proof-1",
        issuedAt: "2026-05-25T23:00:00.000Z",
        policyId: "policy-1",
        version: 1,
      },
      ["signer-a"],
      KEY,
    );

    expect(new ComplyGateService({ hmacKey: KEY, now: () => NOW }).evaluate(policy)).toMatchObject({
      control: "DENY",
      reason: "dual_sign_missing",
    });
  });

  it("denies policies without FPV proof hash", () => {
    const policy = createSignedComplyPolicy(
      {
        allowRules: ["agent.run"],
        expiresAt: "2026-05-26T01:00:00.000Z",
        fpvProofHash: "",
        issuedAt: "2026-05-25T23:00:00.000Z",
        policyId: "policy-1",
        version: 1,
      },
      ["signer-a", "signer-b"],
      KEY,
    );

    expect(new ComplyGateService({ hmacKey: KEY, now: () => NOW }).evaluate(policy)).toMatchObject({
      control: "DENY",
      reason: "fpv_missing",
    });
  });

  it("runs DMS dry-run without external side effects", () => {
    expect(new DmsService().trigger({ dryRun: true, reason: "policy_tamper" })).toMatchObject({
      control: "PASS",
      dryRun: true,
    });
  });

  it("records DMS triggers in a WORM chain", () => {
    const dms = new DmsService();
    const first = dms.trigger({ dryRun: true, reason: "policy_tamper" });
    const second = dms.trigger({ dryRun: true, reason: "heartbeat_missed" });

    expect(second.record?.prevHash).toBe(first.record?.hash);
    expect(dms.verify()).toBe(true);
  });

  it("maps incident score to governor levels", () => {
    const governor = new IncidentGovernorService();

    expect(governor.evaluate(0).level).toBe("NORMAL");
    expect(governor.evaluate(35).level).toBe("CAUTION");
    expect(governor.evaluate(65).level).toBe("WARNING");
    expect(governor.evaluate(90).level).toBe("CRITICAL");
  });
});

describe("Phase 3 L2 Seyer, TrustMetabolism, Consensus, WORM", () => {
  it("passes 2-of-3 consensus votes", () => {
    expect(
      new ConsensusGateService().vote([
        { engine: "RuleEngine", control: "PASS" },
        { engine: "AnomalyEngine", control: "PASS" },
        { engine: "ConsensusVoter", control: "DENY" },
      ]),
    ).toMatchObject({ control: "PASS" });
  });

  it("fails closed on one consensus engine fault", () => {
    expect(
      new ConsensusGateService().vote([
        { engine: "RuleEngine", control: "PASS" },
        { engine: "AnomalyEngine", control: "FAULT" },
        { engine: "ConsensusVoter", control: "PASS" },
      ]),
    ).toMatchObject({ control: "DENY", reason: "engine_fault" });
  });

  it("fails closed when fewer than two engines pass", () => {
    expect(
      new ConsensusGateService().vote([
        { engine: "RuleEngine", control: "PASS" },
        { engine: "AnomalyEngine", control: "DENY" },
        { engine: "ConsensusVoter", control: "DENY" },
      ]),
    ).toMatchObject({ control: "DENY", reason: "insufficient_consensus" });
  });

  it("decays trust with inactivity", () => {
    const metabolism = new TrustMetabolismService();

    expect(
      metabolism.decay({
        baseline: 100,
        lastActiveAt: new Date(NOW.getTime() - 3_600_000),
        now: NOW,
        trustScore: 100,
      }).trustScore,
    ).toBeLessThan(100);
  });

  it("recovers trust on activity without exceeding baseline", () => {
    const metabolism = new TrustMetabolismService();

    expect(metabolism.recover({ baseline: 80, trustScore: 40 }).trustScore).toBeLessThanOrEqual(80);
  });

  it("records WORM logs with prevHash", () => {
    const worm = new WormLogService();
    const first = worm.append({ level: "INFO", message: "gate-pass", source: "seyer" });
    const second = worm.append({ level: "WARN", message: "gate-observe", source: "seyer" });

    expect(first.prevHash).toBe("GENESIS");
    expect(second.prevHash).toBe(first.hash);
    expect(worm.verify()).toBe(true);
  });

  it("detects tampered WORM logs", () => {
    const worm = new WormLogService();
    const record = worm.append({ level: "INFO", message: "gate-pass", source: "seyer" });

    expect(worm.verify([{ ...record, message: "changed" }])).toBe(false);
  });

  it("passes all ten Seyer gates when every input is green", () => {
    expect(
      new SeyerGateService(new ConsensusGateService(), new WormLogService()).evaluate({
        anomaly: "PASS",
        budget: "PASS",
        consensusVotes: [
          { engine: "RuleEngine", control: "PASS" },
          { engine: "AnomalyEngine", control: "PASS" },
          { engine: "ConsensusVoter", control: "PASS" },
        ],
        nk: "PASS",
        oracle: "PASS",
        policy: "PASS",
        session: "PASS",
        sod: "PASS",
        tokenNorm: "PASS",
        trust: "PASS",
      }),
    ).toMatchObject({ control: "PASS", completedSteps: 10 });
  });

  it("denies Seyer gate chain on any failed step", () => {
    expect(
      new SeyerGateService(new ConsensusGateService(), new WormLogService()).evaluate({
        anomaly: "PASS",
        budget: "PASS",
        consensusVotes: [
          { engine: "RuleEngine", control: "PASS" },
          { engine: "AnomalyEngine", control: "PASS" },
          { engine: "ConsensusVoter", control: "PASS" },
        ],
        nk: "PASS",
        oracle: "PASS",
        policy: "DENY",
        session: "PASS",
        sod: "PASS",
        tokenNorm: "PASS",
        trust: "PASS",
      }),
    ).toMatchObject({ control: "DENY", failedStep: "PolicyGate" });
  });

  it("records Seyer outcomes into WORM log", () => {
    const worm = new WormLogService();
    new SeyerGateService(new ConsensusGateService(), worm).evaluate({
      anomaly: "PASS",
      budget: "PASS",
      consensusVotes: [
        { engine: "RuleEngine", control: "PASS" },
        { engine: "AnomalyEngine", control: "PASS" },
        { engine: "ConsensusVoter", control: "PASS" },
      ],
      nk: "PASS",
      oracle: "PASS",
      policy: "PASS",
      session: "PASS",
      sod: "PASS",
      tokenNorm: "PASS",
      trust: "PASS",
    });

    expect(worm.records).toHaveLength(1);
    expect(worm.verify()).toBe(true);
  });
});
