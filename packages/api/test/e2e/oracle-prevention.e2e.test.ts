import "reflect-metadata";

import { Controller, Get, HttpCode, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";

import { AppModule } from "../../src/app.module";
import { headerValueLength, request, type HttpResult } from "./http-client";

const WARMUP_COUNT = 50;
const MEASUREMENT_COUNT = 1000;
const BATCH_SIZE = 50;

@Controller()
class OracleStatsController {
  @Get("/ok")
  ok(): Record<string, boolean> {
    return { ok: true };
  }

  @Get("/blocked")
  @HttpCode(403)
  blocked(): Record<string, boolean> {
    return { blocked: true };
  }
}

@Module({
  imports: [AppModule],
  controllers: [OracleStatsController],
})
class OracleStatsE2eModule {}

describe("OraclePrevention response distribution e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(OracleStatsE2eModule, { logger: false });
    app.getHttpAdapter().getInstance().disable("x-powered-by");
    await app.listen(0);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it(
    "keeps success and rejection response form aligned under local load",
    async () => {
      await runBatched(WARMUP_COUNT, (index) =>
        request(app, { path: index % 2 === 0 ? "/ok" : "/blocked" }),
      );

      const { normal, rejected } = await runPairedBatched(
        app,
        MEASUREMENT_COUNT,
      );

      const normalSample = normal[0];
      const rejectedSample = rejected[0];
      expect(normalSample).toBeDefined();
      expect(rejectedSample).toBeDefined();

      expect(new Set(normal.map((item) => item.statusCode))).toEqual(
        new Set([200]),
      );
      expect(new Set(rejected.map((item) => item.statusCode))).toEqual(
        new Set([403]),
      );

      for (const response of [...normal, ...rejected]) {
        expect(response.headers["content-length"]).toBe("512");
        expect(response.headers["content-encoding"]).toBe("identity");
        expect(response.headers["x-coesite-eml"]).toMatch(/^[0-9a-f]{32}$/u);
        expect(Buffer.byteLength(response.body)).toBe(512);
        expect(Buffer.byteLength(response.body) % 512).toBe(0);
      }

      expect(Object.keys(normalSample!.headers).sort()).toEqual(
        Object.keys(rejectedSample!.headers).sort(),
      );
      for (const headerName of Object.keys(normalSample!.headers)) {
        expect(headerValueLength(normalSample!.headers[headerName])).toBe(
          headerValueLength(rejectedSample!.headers[headerName]),
        );
      }

      const normalStats = stats(normal.map((item) => item.durationMs));
      const rejectedStats = stats(rejected.map((item) => item.durationMs));
      const pValue = welchTTestPValue(
        normalStats,
        rejectedStats,
        MEASUREMENT_COUNT,
        MEASUREMENT_COUNT,
      );

      expect(Math.abs(normalStats.mean - rejectedStats.mean)).toBeLessThan(15);
      expect(pValue).toBeGreaterThan(0.05);
    },
    120_000,
  );
});

async function runBatched<T>(
  count: number,
  factory: (index: number) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];
  for (let start = 0; start < count; start += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count - start);
    const batch = await Promise.all(
      Array.from({ length: batchSize }, (_item, offset) =>
        factory(start + offset),
      ),
    );
    results.push(...batch);
  }

  return results;
}

async function runPairedBatched(
  app: INestApplication,
  count: number,
): Promise<{ normal: HttpResult[]; rejected: HttpResult[] }> {
  const normal: HttpResult[] = [];
  const rejected: HttpResult[] = [];

  for (let start = 0; start < count; start += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count - start);
    const batch = await Promise.all(
      Array.from({ length: batchSize * 2 }, (_item, offset) =>
        request(app, {
          path: offset % 2 === 0 ? "/ok" : "/blocked",
        }),
      ),
    );

    for (let index = 0; index < batch.length; index += 2) {
      normal.push(batch[index]!);
      rejected.push(batch[index + 1]!);
    }
  }

  return { normal, rejected };
}

function stats(values: number[]): { mean: number; variance: number } {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);

  return { mean, variance };
}

function welchTTestPValue(
  a: { mean: number; variance: number },
  b: { mean: number; variance: number },
  aCount: number,
  bCount: number,
): number {
  const standardError = Math.sqrt(a.variance / aCount + b.variance / bCount);
  if (standardError === 0) {
    return 1;
  }

  const t = Math.abs(a.mean - b.mean) / standardError;
  return 2 * (1 - normalCdf(t));
}

function normalCdf(value: number): number {
  return (1 + erf(value / Math.SQRT2)) / 2;
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x));

  return sign * y;
}
