import { afterEach, describe, expect, it, vi } from "vitest";

import { EmlFailClosedError, emlHex } from "./eml.util";
import { OraclePreventionService } from "./oracle-prevention.service";
import { createPaddedJsonBody, isKSegmentSize } from "./size-padding.util";
import type { OracleHttpResponse } from "./types";

interface CapturedResponse extends OracleHttpResponse {
  readonly headers: Record<string, string>;
  body?: string;
}

function createResponse(): CapturedResponse {
  return {
    headers: {},
    status(statusCode: number): CapturedResponse {
      this.statusCode = statusCode;
      return this;
    },
    setHeader(name: string, value: string): void {
      this.headers[name.toLowerCase()] = value;
    },
    end(body?: string): void {
      this.body = body;
    },
  };
}

describe("OraclePreventionService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("pads JSON bodies to the configured K segment without changing parsed data", () => {
    const body = createPaddedJsonBody({ ok: true });
    const parsed = JSON.parse(body) as Record<string, unknown>;

    expect(isKSegmentSize(Buffer.byteLength(body))).toBe(true);
    expect(parsed).toEqual({ ok: true });
    expect(parsed).not.toHaveProperty("_pad");
  });

  it("uses a 32-character lowercase hex EML header for rejection", async () => {
    const service = new OraclePreventionService({ minimumElapsedMs: 0 });
    const response = createResponse();

    await service.padAndReject(response, { source: "unit-test" });

    expect(response.statusCode).toBe(403);
    expect(response.headers["x-coesite-eml"]).toMatch(/^[0-9a-f]{32}$/u);
    expect(Buffer.byteLength(response.headers["x-coesite-eml"])).toBe(32);
    expect(response.headers["content-length"]).toBe("512");
    expect(Buffer.byteLength(response.body ?? "")).toBe(512);
  });

  it("masks successful response EML without exposing a nonce", async () => {
    const service = new OraclePreventionService({ minimumElapsedMs: 0 });
    const response = createResponse();

    await service.padSuccess(response, { ok: true });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-coesite-eml"]).toMatch(/^[0-9a-f]{32}$/u);
    expect(response.headers["x-coesite-eml"]).not.toBe(
      "00000000000000000000000000000000",
    );
    expect(response.headers["x-coesite-nonce"]).toBeUndefined();
    expect(Buffer.byteLength(response.body ?? "")).toBe(512);
  });

  it("does not repeat the EML header for the same rejection finding", async () => {
    const service = new OraclePreventionService({ minimumElapsedMs: 0 });
    const observed = new Set<string>();

    for (let index = 0; index < 100; index += 1) {
      const response = createResponse();
      await service.padAndReject(response, {
        source: "unit-test",
        statusCode: 403,
        reason: "same-finding",
      });
      observed.add(response.headers["x-coesite-eml"]);
    }

    expect(observed.size).toBe(100);
  });

  it("keeps oversized payload responses JSON-parseable within the 4096 byte cap", () => {
    const body = createPaddedJsonBody({ data: "x".repeat(10_000) });

    expect(() => JSON.parse(body)).not.toThrow();
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(4096);
    expect(isKSegmentSize(Buffer.byteLength(body))).toBe(true);
  });

  it("fails closed for circular, BigInt, and huge payloads on the uniform path", async () => {
    const circular: Record<string, unknown> = { ok: true };
    circular.self = circular;
    const payloads: unknown[] = [
      circular,
      { value: 1n },
      { data: "x".repeat(100_000) },
    ];
    const service = new OraclePreventionService({ minimumElapsedMs: 0 });

    for (const payload of payloads) {
      const response = createResponse();
      await expect(service.padSuccess(response, payload)).resolves.toBeUndefined();
      expect(response.body).toBeDefined();
      expect(Buffer.byteLength(response.body ?? "")).toBeLessThanOrEqual(4096);
      expect(() => JSON.parse(response.body ?? "")).not.toThrow();
    }
  });

  it.each([
    ["zero", 1, 0],
    ["negative", 1, -1],
    ["NaN", Number.NaN, 1],
    ["Infinity", Number.POSITIVE_INFINITY, 1],
  ])("fails closed for invalid EML input: %s", (_name, x, y) => {
    expect(() => emlHex(x, y)).toThrow(EmlFailClosedError);
  });

  it("pads short responses to the minimum elapsed time", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "performance"] });
    const service = new OraclePreventionService({ minimumElapsedMs: 1000 });
    const response = createResponse();

    const pending = service.padSuccess(response, { ok: true });
    await vi.advanceTimersByTimeAsync(999);
    expect(response.body).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect(response.body).toBeDefined();
    vi.useRealTimers();
  });

  it("destroys already-sent responses instead of silently returning", async () => {
    const service = new OraclePreventionService({ minimumElapsedMs: 0 });
    const response = {
      ...createResponse(),
      destroy: vi.fn(),
      headersSent: true,
    };

    await service.padAndReject(response, { source: "already-sent" });

    expect(response.destroy).toHaveBeenCalledWith(expect.any(Error));
    expect(response.body).toBeUndefined();
  });
});
