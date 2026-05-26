import { createHash, timingSafeEqual } from "node:crypto";

import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type {
  CoesiteEvidenceRef,
  CoesiteGuardRequest,
  CoesiteGuardResponse,
} from "@coesite/types";
import { attachCoesiteGuardReceipt } from "@coesite/utils";

import {
  MVP_DEFAULT_BEHAVIOR,
  MVP_DEFAULT_SESSION_BUDGET,
  MVP_DEFAULT_SESSION_BUDGET_COST,
  MVP_DEFAULT_TRUST_BASELINE,
  MVP_DEFAULT_TRUST_SCORE,
  MVP_POLICY_ID,
  MVP_POLICY_VERSION,
  MVP_RUNTIME_VERSION,
  type MvpApiCredential,
  type MvpHumanApprovalArtifact,
  getMvpAllowedActions,
  getMvpApiCredentials,
  getMvpApproverRefs,
  getMvpHumanGateActions,
  getMvpPolicyHmacKey,
  getMvpResponseHmacKey,
  verifyMvpHumanApprovalArtifact,
} from "../common/mvp-runtime";
import {
  RuntimeSeyerGateService,
  createSignedComplyPolicy,
} from "../trust-cube";
import { PreviewBudgetService, ProofBundleService } from "../proof-gate";
import { SessionBudgetService } from "../turing";

const PUBLIC_STRING_MAX_LENGTH = 128;

interface GuardHttpRequest {
  readonly headers?: Record<string, string | readonly string[] | undefined>;
  readonly ip?: string;
  readonly socket?: { readonly remoteAddress?: string };
}

@Controller("/v1/guard")
export class GuardController {
  constructor(
    @Inject(RuntimeSeyerGateService)
    private readonly runtimeSeyerGateService: RuntimeSeyerGateService,
    @Inject(SessionBudgetService)
    private readonly sessionBudgetService: SessionBudgetService,
    @Inject(ProofBundleService)
    private readonly proofBundleService: ProofBundleService,
    @Inject(PreviewBudgetService)
    private readonly previewBudgetService: PreviewBudgetService,
  ) {}

  @Post("/verify")
  @HttpCode(200)
  async verify(
    @Body() request: Partial<CoesiteGuardRequest>,
    @Req() httpRequest: GuardHttpRequest,
  ): Promise<CoesiteGuardResponse> {
    const normalized = normalizeGuardRequest(request);
    const credential = assertAuthorized(httpRequest, normalized);
    const now = new Date();
    const sessionId = normalized.subjectRef;
    // Runtime security state is server-derived; public context stays business metadata.
    this.sessionBudgetService.ensureSession({
      budget: MVP_DEFAULT_SESSION_BUDGET,
      expiresAt: new Date(now.getTime() + 3_600_000),
      sessionId,
    });

    const previewBudget = this.previewBudgetService.consume(sessionId);
    if (previewBudget.control === "DENY") {
      const response = attachCoesiteGuardReceipt(
        {
          control: "BLOCK",
          evidence: [
            { kind: "trace", ref: createBudgetTraceRef(sessionId, normalized.requestId) },
            { kind: "policy", ref: `${MVP_POLICY_ID}:${MVP_POLICY_VERSION}` },
          ],
          requestId: normalized.requestId,
          signals: {
            confidence: 1,
            flags: ["preview_budget_exhausted", "guard_blocked"],
            riskScore: 100,
          },
        },
        getMvpResponseHmacKey(),
      );
      this.proofBundleService.recordGuardDecision({
        action: normalized.action,
        policyVersion: `${MVP_POLICY_ID}:${MVP_POLICY_VERSION}`,
        resource: normalized.resource,
        response,
        runtimeVersion: MVP_RUNTIME_VERSION,
        subjectRef: normalized.subjectRef,
      });
      return response;
    }

    const result = await this.runtimeSeyerGateService.evaluate({
      agentId: normalized.subjectRef,
      approverRefs: resolveApproverRefs(normalized, credential, now),
      behavior: MVP_DEFAULT_BEHAVIOR,
      candidateTokens: [normalized.action, "POST /v1/guard/verify"],
      now,
      path: "/v1/guard/verify",
      payload: {
        action: normalized.action,
        context: createRuntimePublicContext(normalized.context),
        resource: normalized.resource,
        subjectRef: normalized.subjectRef,
      },
      policy: createSignedComplyPolicy(
        {
          allowRules: getMvpAllowedActions(),
          expiresAt: new Date(now.getTime() + 300_000).toISOString(),
          fpvProofHash: `${MVP_POLICY_ID}-fpv-v${MVP_POLICY_VERSION}`,
          issuedAt: new Date(now.getTime() - 1_000).toISOString(),
          policyId: MVP_POLICY_ID,
          version: MVP_POLICY_VERSION,
        },
        ["mvp-signer-a", "mvp-signer-b"],
        getMvpPolicyHmacKey(),
      ),
      policyVersion: `${MVP_POLICY_ID}:${MVP_POLICY_VERSION}`,
      requestId: normalized.requestId,
      requesterRef: normalized.subjectRef,
      runtimeVersion: MVP_RUNTIME_VERSION,
      sessionBudgetCost: MVP_DEFAULT_SESSION_BUDGET_COST,
      sessionId,
      sourceIp: httpRequest.ip ?? httpRequest.socket?.remoteAddress ?? "0.0.0.0",
      trust: {
        baseline: MVP_DEFAULT_TRUST_BASELINE,
        lastActiveAt: now,
        now,
        trustScore: MVP_DEFAULT_TRUST_SCORE,
      },
    });

    const evidence: CoesiteEvidenceRef[] = [
      { kind: "trace", ref: result.provenance.hash },
      { kind: "policy", ref: `${MVP_POLICY_ID}:${MVP_POLICY_VERSION}` },
    ];

    const flags = result.control === "PASS" ? ["guard_passed"] : ["guard_blocked"];

    const response = attachCoesiteGuardReceipt(
      {
        control: result.control === "PASS" ? "PROCEED" : "BLOCK",
        evidence,
        requestId: normalized.requestId,
        signals: {
          confidence: 1,
          flags,
          riskScore: result.control === "PASS" ? 0 : 100,
        },
      },
      getMvpResponseHmacKey(),
    );
    this.proofBundleService.recordGuardDecision({
      action: normalized.action,
      policyVersion: `${MVP_POLICY_ID}:${MVP_POLICY_VERSION}`,
      resource: normalized.resource,
      response,
      runtimeVersion: MVP_RUNTIME_VERSION,
      subjectRef: normalized.subjectRef,
    });
    return response;
  }
}

function createRuntimePublicContext(
  context: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const publicContext: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context ?? {})) {
    if (key !== "humanApproval") {
      publicContext[key] = value;
    }
  }

  return publicContext;
}

function normalizeGuardRequest(
  request: Partial<CoesiteGuardRequest>,
): CoesiteGuardRequest {
  return {
    action: normalizeString(request.action, "unknown.action"),
    context: isRecord(request.context) ? request.context : {},
    idempotencyKey:
      typeof request.idempotencyKey === "string" && request.idempotencyKey !== ""
        ? request.idempotencyKey
        : undefined,
    requestId: normalizeString(request.requestId, "unknown"),
    resource: normalizeString(request.resource, "unknown.resource"),
    subjectRef: normalizeString(request.subjectRef, "unknown.subject"),
  };
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  return value.trim().slice(0, PUBLIC_STRING_MAX_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertAuthorized(
  httpRequest: GuardHttpRequest,
  request: CoesiteGuardRequest,
): MvpApiCredential {
  const authorization = getHeader(httpRequest, "authorization");
  const token =
    authorization?.startsWith("Bearer ") === true
      ? authorization.slice("Bearer ".length).trim()
      : undefined;
  if (token === undefined) {
    throw new ForbiddenException("request_rejected");
  }

  const credential = getMvpApiCredentials().find((item) => safeEqual(item.key, token));
  if (
    credential === undefined ||
    !credential.allowedActions.includes(request.action) ||
    (credential.subjectPrefix !== undefined &&
      !request.subjectRef.startsWith(credential.subjectPrefix))
  ) {
    throw new ForbiddenException("request_rejected");
  }

  return credential;
}

function getHeader(
  httpRequest: GuardHttpRequest,
  name: string,
): string | undefined {
  const headers = httpRequest.headers;
  if (headers === undefined) {
    return undefined;
  }

  const direct = headers[name];
  const value =
    direct ??
    headers[
      Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase()) ??
        name
    ];
  return typeof value === "string" ? value : value?.[0];
}

function safeEqual(expected: string, actual: string): boolean {
  return timingSafeEqual(sha256(expected), sha256(actual));
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function resolveApproverRefs(
  request: CoesiteGuardRequest,
  credential: MvpApiCredential,
  now: Date,
): readonly string[] {
  if (!getMvpHumanGateActions().includes(request.action)) {
    return credential.approverRefs ?? getMvpApproverRefs();
  }

  const artifact = readHumanApprovalArtifact(request.context?.humanApproval);
  if (
    artifact !== undefined &&
    verifyMvpHumanApprovalArtifact({
      action: request.action,
      artifact,
      now,
      requestId: request.requestId,
      resource: request.resource,
      subjectRef: request.subjectRef,
    })
  ) {
    return Array.from(new Set(artifact.humanRefs));
  }

  // Invalid high-risk approval maps to self-approval so Runtime Seyer records a BLOCK.
  return [request.subjectRef];
}

function readHumanApprovalArtifact(
  value: unknown,
): MvpHumanApprovalArtifact | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.approvalId !== "string" ||
    typeof record.expiresAt !== "string" ||
    typeof record.signature !== "string" ||
    !Array.isArray(record.humanRefs)
  ) {
    return undefined;
  }

  const humanRefs = record.humanRefs.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );
  if (humanRefs.length < 2) {
    return undefined;
  }

  return {
    approvalId: record.approvalId,
    expiresAt: record.expiresAt,
    humanRefs,
    signature: record.signature,
  };
}

function createBudgetTraceRef(sessionId: string, requestId: string): string {
  return createHash("sha256")
    .update(`${sessionId}:${requestId}:preview-budget`)
    .digest("hex");
}
