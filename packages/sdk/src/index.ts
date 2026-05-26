import type {
  CoesiteGuardRequest,
  CoesiteGuardResponse,
  CoesiteProofBundleView,
} from "@coesite/types";
import { verifyCoesiteGuardResponseReceipt } from "@coesite/utils";

export interface CoesiteClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly responseVerificationKey: string;
  readonly auditKey?: string;
  readonly fetchImpl?: typeof fetch;
}

export class CoesiteClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly responseVerificationKey: string;
  private readonly auditKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CoesiteClientOptions) {
    if (options.apiKey.trim() === "") {
      throw new Error("coesite_api_key_required");
    }
    if (options.responseVerificationKey.trim() === "") {
      throw new Error("coesite_response_verification_key_required");
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/u, "");
    this.apiKey = options.apiKey.trim();
    this.responseVerificationKey = options.responseVerificationKey.trim();
    const auditKey = options.auditKey?.trim();
    if (options.auditKey !== undefined && auditKey === "") {
      throw new Error("coesite_audit_key_invalid");
    }
    this.auditKey = auditKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async verifyGuard(
    request: CoesiteGuardRequest,
  ): Promise<CoesiteGuardResponse> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/v1/guard/verify`, {
        body: JSON.stringify(request),
        headers: this.createHeaders(),
        method: "POST",
      });

      if (!response.ok) {
        return this.failClosed(request.requestId, "http_not_ok");
      }

      const body = (await response.json()) as unknown;
      return this.parseGuardResponse(request.requestId, body);
    } catch (_error) {
      return this.failClosed(request.requestId, "sdk_fail_closed");
    }
  }


  async getProofBundle(
    requestId: string,
  ): Promise<CoesiteProofBundleView | undefined> {
    if (this.auditKey === undefined) {
      throw new Error("coesite_audit_key_required");
    }

    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/v1/redgate/proofs/${encodeURIComponent(requestId)}`,
        {
          headers: { authorization: `Bearer ${this.auditKey}` },
          method: "GET",
        },
      );

      if (!response.ok) {
        return undefined;
      }

      const body = (await response.json()) as unknown;
      return this.isProofBundleView(body) ? body : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  private parseGuardResponse(
    requestId: string,
    body: unknown,
  ): CoesiteGuardResponse {
    if (!this.isGuardResponse(body)) {
      return this.failClosed(requestId, "invalid_response_shape");
    }
    if (!verifyCoesiteGuardResponseReceipt(body, this.responseVerificationKey)) {
      return this.failClosed(requestId, "invalid_response_receipt");
    }

    return body;
  }

  private isGuardResponse(body: unknown): body is CoesiteGuardResponse {
    if (body === null || typeof body !== "object") {
      return false;
    }

    const candidate = body as CoesiteGuardResponse;
    return (
      typeof candidate.requestId === "string" &&
      (candidate.control === "BLOCK" || candidate.control === "PROCEED") &&
      Array.isArray(candidate.evidence) &&
      candidate.evidence.every(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          (item.kind === "audit" ||
            item.kind === "policy" ||
            item.kind === "trace" ||
            item.kind === "worm") &&
          typeof item.ref === "string" &&
          item.ref.length > 0,
      ) &&
      candidate.signals !== null &&
      typeof candidate.signals === "object" &&
      typeof candidate.signals.riskScore === "number" &&
      candidate.signals.riskScore >= 0 &&
      candidate.signals.riskScore <= 100 &&
      typeof candidate.signals.confidence === "number" &&
      candidate.signals.confidence >= 0 &&
      candidate.signals.confidence <= 1 &&
      Array.isArray(candidate.signals.flags) &&
      candidate.signals.flags.every((flag) => typeof flag === "string") &&
      candidate.receipt !== null &&
      typeof candidate.receipt === "object" &&
      candidate.receipt.algorithm === "HMAC-SHA256" &&
      typeof candidate.receipt.issuedAt === "string" &&
      typeof candidate.receipt.keyId === "string" &&
      typeof candidate.receipt.payloadHash === "string" &&
      typeof candidate.receipt.signature === "string"
    );
  }


  private isProofBundleView(body: unknown): body is CoesiteProofBundleView {
    if (body === null || typeof body !== "object") {
      return false;
    }

    const candidate = body as CoesiteProofBundleView;
    return (
      typeof candidate.action === "string" &&
      isHex64(candidate.bundleId) &&
      isHex64(candidate.contractHash) &&
      (candidate.control === "BLOCK" || candidate.control === "PROCEED") &&
      typeof candidate.createdAt === "string" &&
      Array.isArray(candidate.evidence) &&
      candidate.evidence.every(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          (item.kind === "audit" ||
            item.kind === "policy" ||
            item.kind === "trace" ||
            item.kind === "worm") &&
          isHex64(item.refHash),
      ) &&
      isHex64(candidate.hash) &&
      typeof candidate.policyVersion === "string" &&
      (candidate.prevHash === "GENESIS" || isHex64(candidate.prevHash)) &&
      isHex64(candidate.receiptPayloadHash) &&
      typeof candidate.requestId === "string" &&
      isHex64(candidate.resourceHash) &&
      typeof candidate.runtimeVersion === "string" &&
      isHex64(candidate.subjectRefHash)
    );
  }

  private createHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiKey}`,
      "content-type": "application/json",
    };
  }

  private failClosed(requestId: string, reason: string): CoesiteGuardResponse {
    return {
      control: "BLOCK",
      evidence: [],
      requestId,
      signals: {
        confidence: 1,
        flags: [reason],
        riskScore: 100,
      },
      receipt: {
        algorithm: "HMAC-SHA256",
        issuedAt: "1970-01-01T00:00:00.000Z",
        keyId: "sdk-fail-closed",
        payloadHash: "0".repeat(64),
        signature: "0".repeat(64),
      },
    };
  }
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
