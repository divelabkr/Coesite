import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";

import { OraclePreventionService } from "../../common/oracle-prevention";
import { TokenNormService } from "./token-norm.service";
import type {
  TokenNormFinding,
  TokenNormHttpResponse,
  TokenNormMetadata,
} from "./types";

export interface TokenNormRequest {
  body?: unknown;
  query?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  tokenNormMetadata?: TokenNormMetadata;
}

@Injectable()
export class TokenNormMiddleware implements NestMiddleware {
  constructor(
    @Inject(TokenNormService)
    private readonly tokenNormService: TokenNormService,
    @Inject(OraclePreventionService)
    private readonly oraclePrevention: OraclePreventionService,
  ) {}

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
      req.tokenNormMetadata = {
        ...req.tokenNormMetadata,
        elapsedMs: this.elapsedSince(startedAt),
      };
      console.error("token-norm rejection", {
        findings: allFindings.map((finding) => ({
          path: finding.path,
          reason: finding.reason,
          metadata: finding.metadata,
        })),
      });
      await this.oraclePrevention.padAndReject(
        res,
        {
          source: "token-norm",
          tokenNormFinding: allFindings[0],
        },
        startedAt,
      );
      return;
    }

    next();
  }

  private elapsedSince(startedAt: number): number {
    return Math.max(0, performance.now() - startedAt);
  }
}
