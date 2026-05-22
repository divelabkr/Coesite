import { describe, expect, it, vi } from "vitest";

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
  it("pads JSON bodies to the configured K segment", () => {
    const body = createPaddedJsonBody({ ok: true });

    expect(isKSegmentSize(Buffer.byteLength(body))).toBe(true);
    expect(JSON.parse(body)).toMatchObject({ ok: true });
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

  it("uses the fixed-width dummy EML header for successful responses", async () => {
    const service = new OraclePreventionService({ minimumElapsedMs: 0 });
    const response = createResponse();

    await service.padSuccess(response, { ok: true });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-coesite-eml"]).toBe(
      "00000000000000000000000000000000",
    );
    expect(Buffer.byteLength(response.body ?? "")).toBe(512);
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
});
