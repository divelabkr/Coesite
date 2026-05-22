import { randomBytes } from "node:crypto";

export const DEFAULT_SEGMENT_SIZE_BYTES = 512;

type JsonRecord = Record<string, unknown>;

export function createPaddedJsonBody(
  payload: unknown,
  segmentSizeBytes = DEFAULT_SEGMENT_SIZE_BYTES,
): string {
  if (!Number.isInteger(segmentSizeBytes) || segmentSizeBytes <= 0) {
    throw new Error("segmentSizeBytes must be a positive integer");
  }

  const basePayload = toJsonRecord(payload);
  let padLength = 0;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const body = JSON.stringify({
      ...basePayload,
      _pad: randomHex(padLength),
    });
    const bodyLength = Buffer.byteLength(body);
    const targetLength =
      Math.ceil(bodyLength / segmentSizeBytes) * segmentSizeBytes;

    if (bodyLength === targetLength) {
      return body;
    }

    padLength += targetLength - bodyLength;
  }

  throw new Error("unable to create K-segment padded JSON body");
}

export function isKSegmentSize(
  byteLength: number,
  segmentSizeBytes = DEFAULT_SEGMENT_SIZE_BYTES,
): boolean {
  return byteLength > 0 && byteLength % segmentSizeBytes === 0;
}

function toJsonRecord(payload: unknown): JsonRecord {
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    return payload as JsonRecord;
  }

  return { data: payload };
}

function randomHex(length: number): string {
  if (length <= 0) {
    return "";
  }

  return randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}
