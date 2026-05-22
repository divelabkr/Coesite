import { Injectable, Optional, type NestMiddleware } from "@nestjs/common";

import { TokenNormService } from "./token-norm.service";
import type {
  TokenNormFinding,
  TokenNormHttpResponse,
  TokenNormMetadata,
  TokenNormMiddlewareOptions,
} from "./types";

const UNIFORM_STATUS = 403;
const UNIFORM_BODY = JSON.stringify({ error: "request_rejected" });
const DEFAULT_MINIMUM_ELAPSED_MS = 200;

export interface TokenNormRequest {
  body?: unknown;
  query?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  tokenNormMetadata?: TokenNormMetadata;
}

@Injectable()
export class TokenNormMiddleware implements NestMiddleware {
  private readonly minimumElapsedMs: number;

  constructor(
    private readonly tokenNormService: TokenNormService,
    @Optional()
    options: TokenNormMiddlewareOptions = {},
  ) {
    this.minimumElapsedMs =
      options.minimumElapsedMs ?? DEFAULT_MINIMUM_ELAPSED_MS;
  }

  async use(
    req: TokenNormRequest,
    res: TokenNormHttpResponse,
    next: (error?: Error) => void,
  ): Promise<void> {
    const startedAt = performance.now();
    const allFindings: TokenNormFinding[] = [];

    const bodyResult = this.tokenNormService.normalize(req.body, "$.body");
    req.body = bodyResult.value;
    allFindings.push(...bodyResult.findings);

    const queryResult = this.tokenNormService.normalize(req.query, "$.query");
    req.query = queryResult.value;
    allFindings.push(...queryResult.findings);

    const headerResult = this.tokenNormService.normalize(
      req.headers,
      "$.headers",
    );
    req.headers = headerResult.value;
    allFindings.push(...headerResult.findings);

    req.tokenNormMetadata = {
      blocked: allFindings.length > 0,
      findings: allFindings,
      inspectedAt: new Date().toISOString(),
      elapsedMs: this.elapsedSince(startedAt),
    };

    if (allFindings.length > 0) {
      await this.padElapsed(startedAt);
      req.tokenNormMetadata = {
        ...req.tokenNormMetadata,
        elapsedMs: this.elapsedSince(startedAt),
      };
      this.writeUniformRejection(res);
      return;
    }

    next();
  }

  private writeUniformRejection(res: TokenNormHttpResponse): void {
    res.status(UNIFORM_STATUS);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.setHeader("content-length", Buffer.byteLength(UNIFORM_BODY).toString());
    res.end(UNIFORM_BODY);
  }

  private async padElapsed(startedAt: number): Promise<void> {
    const remainingMs = this.minimumElapsedMs - this.elapsedSince(startedAt);
    if (remainingMs > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, remainingMs);
      });
    }
  }

  private elapsedSince(startedAt: number): number {
    return Math.max(0, performance.now() - startedAt);
  }
}
