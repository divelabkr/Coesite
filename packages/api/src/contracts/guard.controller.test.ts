import { ForbiddenException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CoesiteGuardRequest } from "@coesite/types";

import { PreviewBudgetService, ProofBundleService } from "../proof-gate";
import { SessionBudgetService } from "../turing";
import type {
  RuntimeSeyerGateInput,
  RuntimeSeyerGateResult,
  RuntimeSeyerGateService,
} from "../trust-cube";
import { createMvpHumanApprovalSignature } from "../common/mvp-runtime";
import { GuardController } from "./guard.controller";

const TEST_API_KEY = "test-api-key";
const VALID_AUTH = `Bearer ${TEST_API_KEY}`;

const guardRequest: CoesiteGuardRequest = {
  action: "read",
  requestId: "req-1",
  resource: "doc-1",
  subjectRef: "agent-1",
};

describe("GuardController paid MVP boundary regressions", () => {
  beforeEach(() => {
    vi.stubEnv("COESITE_ALLOWED_ACTIONS", "read,agent.run,POST /v1/guard/verify");
    vi.stubEnv("COESITE_API_KEYS", TEST_API_KEY);
    vi.stubEnv("COESITE_APPROVER_REFS", "ops-human-1,ops-human-2");
    vi.stubEnv("COESITE_HUMAN_APPROVAL_HMAC_KEY", "test-human-approval-key");
    vi.stubEnv("COESITE_POLICY_HMAC_KEY", "test-policy-hmac-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed before runtime evaluation when the API key is missing", async () => {
    const { controller, evaluate } = createController();

    await expect(
      controller.verify(guardRequest, httpRequest({ authorization: undefined })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("fails closed before runtime evaluation when the API key is invalid", async () => {
    const { controller, evaluate } = createController();

    await expect(
      controller.verify(guardRequest, httpRequest({ authorization: "Bearer wrong" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("does not let caller-controlled context choose session id or budget", async () => {
    const { captureInput, ensureSession } = createController();

    const input = await captureInput({
      sessionBudget: 999_999,
      sessionId: "attacker-session",
    });

    expect(ensureSession).toHaveBeenCalledWith(
      expect.objectContaining({
        budget: 100,
        sessionId: "agent-1",
      }),
    );
    expect(input.sessionId).toBe("agent-1");
  });

  it("does not let caller-controlled context discount budget cost", async () => {
    const { captureInput } = createController();

    const input = await captureInput({ budgetCost: 0.001 });

    expect(input.sessionBudgetCost).toBe(1);
  });

  it("does not let caller-controlled context replace SoD approvers", async () => {
    const { captureInput } = createController();

    const input = await captureInput({
      approverRefs: ["agent-1", "attacker-controlled-reviewer"],
    });

    expect(input.approverRefs).toEqual(["ops-human-1", "ops-human-2"]);
  });

  it("does not let caller-controlled context spoof fingerprint behavior", async () => {
    const { captureInput } = createController();

    const input = await captureInput({
      requestIntervalsMs: [1],
      responseCodes: [500],
      tokenCounts: [999_999],
    });

    expect(input.behavior).toEqual({
      requestIntervalsMs: [100],
      responseCodes: [200],
      tokenCounts: [1],
    });
  });

  it("does not let caller-controlled context spoof source IP", async () => {
    const { captureInput } = createController();

    const input = await captureInput({ sourceIp: "10.0.0.1" });

    expect(input.sourceIp).toBe("198.51.100.10");
  });

  it("does not let caller-controlled context spoof trust inputs", async () => {
    const { captureInput } = createController();

    const input = await captureInput({
      trustBaseline: 1,
      trustScore: 1,
    });

    expect(input.trust.baseline).toBe(100);
    expect(input.trust.trustScore).toBe(100);
  });

  it("fails closed before runtime evaluation when API key scope excludes the action", async () => {
    vi.stubEnv(
      "COESITE_API_KEY_REGISTRY",
      JSON.stringify([
        {
          allowedActions: ["read"],
          key: TEST_API_KEY,
          tenantRef: "tenant-1",
        },
      ]),
    );
    const { controller, evaluate } = createController();

    await expect(
      controller.verify(
        { ...guardRequest, action: "agent.run" },
        httpRequest({ authorization: VALID_AUTH }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("fails closed before runtime evaluation when API key subject binding mismatches", async () => {
    vi.stubEnv(
      "COESITE_API_KEY_REGISTRY",
      JSON.stringify([
        {
          allowedActions: ["read"],
          key: TEST_API_KEY,
          subjectPrefix: "tenant-1:",
          tenantRef: "tenant-1",
        },
      ]),
    );
    const { controller, evaluate } = createController();

    await expect(
      controller.verify(guardRequest, httpRequest({ authorization: VALID_AUTH })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("forces high-risk actions through SoD denial when HumanGate approval is missing", async () => {
    const { captureInput } = createController();

    const input = await captureInput({}, { action: "agent.run" });

    expect(input.approverRefs).toEqual(["agent-1"]);
  });

  it("uses signed HumanGate approval artifacts for high-risk action SoD", async () => {
    const { captureInput } = createController();
    const approval = createHumanApproval();

    const input = await captureInput(
      { humanApproval: approval },
      { action: "agent.run" },
    );

    expect(input.approverRefs).toEqual(["human-1", "human-2"]);
  });

  it("removes HumanGate artifacts from runtime payload after verifier use", async () => {
    const { captureInput } = createController();
    const approval = createHumanApproval();

    const input = await captureInput(
      { businessRef: "case-1", humanApproval: approval },
      { action: "agent.run" },
    );

    expect(input.payload).toEqual({
      action: "agent.run",
      context: { businessRef: "case-1" },
      resource: "doc-1",
      subjectRef: "agent-1",
    });
  });

  it("records a proof bundle for every signed runtime response", async () => {
    const { controller, recordGuardDecision } = createController();

    const response = await controller.verify(
      guardRequest,
      httpRequest({ authorization: VALID_AUTH }),
    );

    expect(recordGuardDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "read",
        resource: "doc-1",
        response,
        subjectRef: "agent-1",
      }),
    );
  });

  it("fails closed with a signed proof when preview budget is exhausted", async () => {
    const { controller, evaluate, recordGuardDecision } = createController({
      previewBudget: {
        control: "DENY",
        reason: "preview_exhausted",
        remaining: 0,
      },
    });

    const response = await controller.verify(
      guardRequest,
      httpRequest({ authorization: VALID_AUTH }),
    );

    expect(evaluate).not.toHaveBeenCalled();
    expect(response.control).toBe("BLOCK");
    expect(response.signals.flags).toContain("preview_budget_exhausted");
    expect(recordGuardDecision).toHaveBeenCalledWith(
      expect.objectContaining({ response, subjectRef: "agent-1" }),
    );
  });
});

function createController(options: {
  readonly previewBudget?: {
    readonly control: "DENY" | "PASS";
    readonly reason: "preview_consumed" | "preview_exhausted";
    readonly remaining: number;
  };
} = {}): {
  readonly captureInput: (
    context?: Record<string, unknown>,
    overrides?: Partial<CoesiteGuardRequest>,
  ) => Promise<RuntimeSeyerGateInput>;
  readonly controller: GuardController;
  readonly ensureSession: ReturnType<typeof vi.fn>;
  readonly evaluate: ReturnType<typeof vi.fn>;
  readonly recordGuardDecision: ReturnType<typeof vi.fn>;
} {
  const evaluate = vi.fn().mockResolvedValue(createPassResult());
  const ensureSession = vi.fn();
  const recordGuardDecision = vi.fn();
  const consume = vi.fn().mockReturnValue(
    options.previewBudget ?? {
      control: "PASS",
      reason: "preview_consumed",
      remaining: 99,
    },
  );
  const controller = new GuardController(
    { evaluate } as unknown as RuntimeSeyerGateService,
    { ensureSession } as unknown as SessionBudgetService,
    { recordGuardDecision } as unknown as ProofBundleService,
    { consume } as unknown as PreviewBudgetService,
  );

  return {
    async captureInput(
      context: Record<string, unknown> = {},
      overrides: Partial<CoesiteGuardRequest> = {},
    ) {
      await controller.verify(
        { ...guardRequest, ...overrides, context },
        httpRequest({ authorization: VALID_AUTH }),
      );
      const [input] = evaluate.mock.calls[0] as [RuntimeSeyerGateInput];
      return input;
    },
    controller,
    ensureSession,
    evaluate,
    recordGuardDecision,
  };
}

function createHumanApproval(): {
  readonly approvalId: string;
  readonly expiresAt: string;
  readonly humanRefs: readonly string[];
  readonly signature: string;
} {
  const artifact = {
    action: "agent.run",
    approvalId: "approval-1",
    expiresAt: "2099-01-01T00:00:00.000Z",
    humanRefs: ["human-1", "human-2"],
    requestId: "req-1",
    resource: "doc-1",
    subjectRef: "agent-1",
  };

  return {
    approvalId: artifact.approvalId,
    expiresAt: artifact.expiresAt,
    humanRefs: artifact.humanRefs,
    signature: createMvpHumanApprovalSignature(
      artifact,
      "test-human-approval-key",
    ),
  };
}

function httpRequest(headers: Record<string, string | undefined>) {
  return {
    headers,
    ip: "198.51.100.10",
    socket: { remoteAddress: "203.0.113.10" },
  } as unknown as Parameters<GuardController["verify"]>[1];
}

function createPassResult(): RuntimeSeyerGateResult {
  return {
    control: "PASS",
    provenance: {
      agentId: "agent-1",
      createdAt: "2026-05-26T00:00:00.000Z",
      hash: "trace-1",
      payloadHash: "payload-1",
      policyVersion: "policy:1",
      prevHash: "GENESIS",
      runtimeVersion: "runtime-1",
    },
    seyer: {
      completedSteps: 10,
      control: "PASS",
    },
    tokenNormFindings: [],
    votes: [],
  };
}
