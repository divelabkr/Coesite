export type CoesiteControl = "PROCEED" | "BLOCK";

export interface CoesiteSignals {
  readonly riskScore: number;
  readonly confidence: number;
  readonly flags: readonly string[];
}

export interface CoesiteEvidenceRef {
  readonly kind: "audit" | "worm" | "trace" | "policy";
  readonly ref: string;
}

export interface CoesiteGuardReceipt {
  readonly algorithm: "HMAC-SHA256";
  readonly issuedAt: string;
  readonly keyId: string;
  readonly payloadHash: string;
  readonly signature: string;
}

export interface CoesiteGuardRequest {
  readonly requestId: string;
  readonly subjectRef: string;
  readonly action: string;
  readonly resource: string;
  readonly context?: Record<string, unknown>;
  readonly idempotencyKey?: string;
}

export interface CoesiteGuardResponse {
  readonly requestId: string;
  readonly control: CoesiteControl;
  readonly signals: CoesiteSignals;
  readonly evidence: readonly CoesiteEvidenceRef[];
  readonly receipt: CoesiteGuardReceipt;
}

export interface CoesiteProofEvidenceDigest {
  readonly kind: CoesiteEvidenceRef["kind"];
  readonly refHash: string;
}

export interface CoesiteProofBundleView {
  readonly action: string;
  readonly bundleId: string;
  readonly contractHash: string;
  readonly control: CoesiteControl;
  readonly createdAt: string;
  readonly evidence: readonly CoesiteProofEvidenceDigest[];
  readonly hash: string;
  readonly policyVersion: string;
  readonly prevHash: string;
  readonly receiptPayloadHash: string;
  readonly requestId: string;
  readonly resourceHash: string;
  readonly runtimeVersion: string;
  readonly subjectRefHash: string;
}

export interface CoesiteErrorEnvelope {
  readonly error: "request_rejected";
}
