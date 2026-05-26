import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { CoesiteGuardReceipt, CoesiteGuardResponse } from "@coesite/types";

export type CoesiteGuardReceiptPayload = Omit<CoesiteGuardResponse, "receipt">;

export interface CoesiteGuardReceiptOptions {
  readonly issuedAt?: Date | string;
  readonly keyId?: string;
}

const RECEIPT_ALGORITHM = "HMAC-SHA256";
const DEFAULT_KEY_ID = "coesite-response-key-v1";

export function attachCoesiteGuardReceipt(
  payload: CoesiteGuardReceiptPayload,
  hmacKey: string,
  options: CoesiteGuardReceiptOptions = {},
): CoesiteGuardResponse {
  return {
    ...payload,
    receipt: createCoesiteGuardReceipt(payload, hmacKey, options),
  };
}

export function createCoesiteGuardReceipt(
  payload: CoesiteGuardReceiptPayload,
  hmacKey: string,
  options: CoesiteGuardReceiptOptions = {},
): CoesiteGuardReceipt {
  const issuedAt = normalizeIssuedAt(options.issuedAt ?? new Date());
  const keyId = options.keyId ?? DEFAULT_KEY_ID;
  const payloadHash = createCoesiteGuardPayloadHash(payload);

  return {
    algorithm: RECEIPT_ALGORITHM,
    issuedAt,
    keyId,
    payloadHash,
    signature: signReceipt({ issuedAt, keyId, payloadHash }, hmacKey),
  };
}

export function verifyCoesiteGuardResponseReceipt(
  response: CoesiteGuardResponse,
  hmacKey: string,
): boolean {
  if (response.receipt.algorithm !== RECEIPT_ALGORITHM) {
    return false;
  }

  const payloadHash = createCoesiteGuardPayloadHash({
    control: response.control,
    evidence: response.evidence,
    requestId: response.requestId,
    signals: response.signals,
  });
  if (!safeEqual(payloadHash, response.receipt.payloadHash)) {
    return false;
  }

  const expectedSignature = signReceipt(response.receipt, hmacKey);
  return safeEqual(expectedSignature, response.receipt.signature);
}

export function createCoesiteGuardPayloadHash(
  payload: CoesiteGuardReceiptPayload,
): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function signReceipt(
  receipt: Pick<CoesiteGuardReceipt, "issuedAt" | "keyId" | "payloadHash">,
  hmacKey: string,
): string {
  return createHmac("sha256", hmacKey)
    .update(
      stableStringify({
        algorithm: RECEIPT_ALGORITHM,
        issuedAt: receipt.issuedAt,
        keyId: receipt.keyId,
        payloadHash: receipt.payloadHash,
      }),
    )
    .digest("hex");
}

function normalizeIssuedAt(issuedAt: Date | string): string {
  const value =
    issuedAt instanceof Date ? issuedAt.toISOString() : new Date(issuedAt).toISOString();
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("invalid Coesite receipt issuedAt");
  }

  return value;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJsonValue(value));
}

function normalizeJsonValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("invalid Coesite receipt number");
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      normalized[key] = normalizeJsonValue((value as Record<string, unknown>)[key]);
    }
    return normalized;
  }

  throw new Error("unsupported Coesite receipt value");
}
