import "reflect-metadata";

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Post,
  Res,
  UnprocessableEntityException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";

import { AppModule } from "../../src/app.module";
import { request } from "./http-client";

@Controller()
class RuntimeController {
  @Get("/ok")
  ok(): Record<string, boolean> {
    return { ok: true };
  }

  @Post("/echo")
  echo(@Body() body: unknown): Record<string, unknown> {
    return { body };
  }

  @Get("/created")
  @HttpCode(201)
  created(): Record<string, boolean> {
    return { created: true };
  }

  @Get("/empty")
  @HttpCode(204)
  empty(): null {
    return null;
  }

  @Get("/redirect")
  redirect(@Res({ passthrough: true }) response: { status(code: number): void }): Record<string, string> {
    response.status(302);
    return { url: "/ok" };
  }

  @Get("/validation")
  validation(): never {
    throw new UnprocessableEntityException("invalid");
  }

  @Get("/exception")
  exception(): never {
    throw new Error("boom");
  }
}

@Module({
  imports: [AppModule],
  controllers: [RuntimeController],
})
class RuntimeE2eModule {}

describe("AppModule OraclePrevention runtime e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(RuntimeE2eModule, { logger: false });
    app.getHttpAdapter().getInstance().disable("x-powered-by");
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it("applies global success padding through AppModule", async () => {
    const response = await request(app, { path: "/ok" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-length"]).toBe("512");
    expect(response.headers["content-encoding"]).toBe("identity");
    expect(response.headers["x-coesite-eml"]).toBe(
      "00000000000000000000000000000000",
    );
    expect(Buffer.byteLength(response.body)).toBe(512);
  });

  it.each([
    ["created", "/created", 201],
    ["204 rejected as external 403", "/empty", 403],
    ["redirect rejected as external 403", "/redirect", 403],
    ["validation rejected as external 403", "/validation", 403],
    ["exception rejected as external 403", "/exception", 403],
    ["unmatched route rejected as external 403", "/missing", 403],
  ])("normalizes runtime status path: %s", async (_name, path, statusCode) => {
    const response = await request(app, { path });

    expect(response.statusCode).toBe(statusCode);
    expect(response.headers["content-length"]).toBe("512");
    expect(Buffer.byteLength(response.body)).toBe(512);
    expect(response.headers["x-coesite-eml"]).toMatch(/^[0-9a-f]{32}$/u);
  });

  it("routes TokenNorm middleware rejection through OraclePreventionService", async () => {
    const response = await request(app, {
      method: "POST",
      path: "/echo",
      body: { token: "pay\u200Bload" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.headers["content-length"]).toBe("512");
    expect(Buffer.byteLength(response.body)).toBe(512);
    expect(response.headers["x-coesite-eml"]).toMatch(/^[0-9a-f]{32}$/u);
  });
});
