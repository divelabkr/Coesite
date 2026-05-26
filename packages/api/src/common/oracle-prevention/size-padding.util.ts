export const DEFAULT_SEGMENT_SIZE_BYTES = 512;
export const DEFAULT_MAX_BODY_BYTES = 4096;

type JsonRecord = Record<string, unknown>;

export function createPaddedJsonBody(
  payload: unknown,
  segmentSizeBytes = DEFAULT_SEGMENT_SIZE_BYTES,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
): string {
  if (!Number.isInteger(segmentSizeBytes) || segmentSizeBytes <= 0) {
    throw new Error("segmentSizeBytes must be a positive integer");
  }
  if (
    !Number.isInteger(maxBodyBytes) ||
    maxBodyBytes < segmentSizeBytes ||
    maxBodyBytes % segmentSizeBytes !== 0
  ) {
    throw new Error("maxBodyBytes must be a positive K-segment integer");
  }

  const basePayload = createSafeJsonRecord(payload, segmentSizeBytes, maxBodyBytes);
  const bodyWithoutPad = stringifyJson(basePayload);

  if (bodyWithoutPad === undefined) {
    return createPaddedJsonBody(
      createSafeSummary(),
      segmentSizeBytes,
      maxBodyBytes,
    );
  }

  const bodyLength = Buffer.byteLength(bodyWithoutPad);
  const targetLength =
    Math.ceil(bodyLength / segmentSizeBytes) * segmentSizeBytes;

  if (targetLength > maxBodyBytes) {
    return createPaddedJsonBody(
      createSafeSummary(),
      segmentSizeBytes,
      maxBodyBytes,
    );
  }

  return bodyWithoutPad + " ".repeat(targetLength - bodyLength);
}

export function isKSegmentSize(
  byteLength: number,
  segmentSizeBytes = DEFAULT_SEGMENT_SIZE_BYTES,
): boolean {
  return byteLength > 0 && byteLength % segmentSizeBytes === 0;
}

function createSafeJsonRecord(
  payload: unknown,
  segmentSizeBytes: number,
  maxBodyBytes: number,
): JsonRecord {
  const candidate = toJsonRecord(payload);
  const serialized = stringifyJson(candidate);

  if (serialized === undefined) {
    return createSafeSummary();
  }

  const targetLength =
    Math.ceil(Buffer.byteLength(serialized) / segmentSizeBytes) *
    segmentSizeBytes;

  return targetLength <= maxBodyBytes ? candidate : createSafeSummary();
}

function createSafeSummary(): JsonRecord {
  return { data: null };
}

function stringifyJson(payload: JsonRecord): string | undefined {
  try {
    return JSON.stringify(payload);
  } catch (_error) {
    return undefined;
  }
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
