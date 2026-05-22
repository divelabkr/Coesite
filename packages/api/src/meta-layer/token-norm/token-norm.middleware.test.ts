import { afterEach, describe, expect, it, vi } from "vitest";

import { OraclePreventionService } from "../../common/oracle-prevention";
import { TokenNormMiddleware, type TokenNormRequest } from "./token-norm.middleware";
import { TokenNormModule } from "./token-norm.module";
import { TokenNormService } from "./token-norm.service";
import type { TokenNormHttpResponse } from "./types";

interface CapturedResponse extends TokenNormHttpResponse {
  readonly headers: Record<string, string>;
  statusCode?: number;
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

describe("TokenNormMiddleware", () => {
  function createMiddleware(minimumElapsedMs = 0): TokenNormMiddleware {
    return new TokenNormMiddleware(
      new TokenNormService(),
      new OraclePreventionService({ minimumElapsedMs }),
    );
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls next for unchanged request fields", async () => {
    const middleware = createMiddleware();
    const req: TokenNormRequest = {
      body: { token: "plain" },
      query: { page: "1" },
      headers: { "x-token": "plain" },
    };
    const res = createResponse();
    const next = vi.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBeUndefined();
    expect(req.tokenNormMetadata?.blocked).toBe(false);
  });

  it("normalizes request fields before passing unchanged requests onward", async () => {
    const middleware = createMiddleware();
    const req: TokenNormRequest = {
      body: { count: 1 },
      query: { tags: ["a", "b"] },
      headers: { "x-safe": ["a", "b"] },
    };
    const res = createResponse();
    const next = vi.fn();

    await middleware.use(req, res, next);

    expect(req.body).toEqual({ count: 1 });
    expect(req.query).toEqual({ tags: ["a", "b"] });
    expect(req.headers).toEqual({ "x-safe": ["a", "b"] });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects body transformations with a uniform response", async () => {
    const middleware = createMiddleware();
    const req: TokenNormRequest = {
      body: { token: "pay\u200Bload" },
      query: {},
      headers: {},
    };
    const res = createResponse();
    const next = vi.fn();

    await middleware.use(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(Buffer.byteLength(res.body ?? "")).toBe(512);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["content-encoding"]).toBe("identity");
    expect(res.headers["content-length"]).toBe("512");
    expect(res.headers["x-coesite-eml"]).toMatch(/^[0-9a-f]{32}$/u);
  });

  it("stores metadata for rejected requests", async () => {
    const middleware = createMiddleware();
    const req: TokenNormRequest = {
      body: {},
      query: { q: "%252Fadmin" },
      headers: {},
    };
    const res = createResponse();

    await middleware.use(req, res, vi.fn());

    expect(req.tokenNormMetadata?.blocked).toBe(true);
    expect(req.tokenNormMetadata?.findings[0]).toMatchObject({
      path: "$.query.q",
      reason: "double_url_decode",
      original: "%252Fadmin",
      normalized: "/admin",
    });
  });

  it("rejects header transformations", async () => {
    const middleware = createMiddleware();
    const req: TokenNormRequest = {
      body: {},
      query: {},
      headers: { "x-token": "cGF5bG9hZA==" },
    };
    const res = createResponse();
    const next = vi.fn();

    await middleware.use(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.tokenNormMetadata?.findings[0]?.path).toBe("$.headers.x-token");
    expect(req.headers).toEqual({ "x-token": "payload" });
  });

  it("pads rejected requests to the configured minimum elapsed time", async () => {
    vi.useFakeTimers();
    const middleware = createMiddleware(1000);
    const req: TokenNormRequest = {
      body: { token: "p\u0430yload" },
      query: {},
      headers: {},
    };
    const res = createResponse();
    const next = vi.fn();

    const pending = middleware.use(req, res, next);
    await vi.advanceTimersByTimeAsync(998);
    expect(res.statusCode).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2);
    await pending;

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("configures TokenNormMiddleware for all routes in its module", () => {
    const forRoutes = vi.fn();
    const consumer = {
      apply: vi.fn(() => ({ forRoutes })),
    };

    new TokenNormModule().configure(consumer as never);

    expect(consumer.apply).toHaveBeenCalledWith(TokenNormMiddleware);
    expect(forRoutes).toHaveBeenCalledWith("*");
  });
});
