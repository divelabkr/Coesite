import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";

import { OraclePreventionService } from "../../common/oracle-prevention";
import { getRequestClockStartedAt } from "../../common/request-clock";
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
  coesiteRequestClockStartedAt?: number;
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
    const startedAt = getRequestClockStartedAt(req) ?? performance.now();
    const allFindings: TokenNormFinding[] = [];

    const bodyResult = this.normalizeBody(req.body);
    req.body = bodyResult.value;
    allFindings.push(...bodyResult.findings);

    const queryResult = this.tokenNormService.normalize(req.query, "$.query");
    this.assignRequestField(req, "query", queryResult.value);
    allFindings.push(...queryResult.findings);

    const headerResult = this.tokenNormService.normalize(
      req.headers,
      "$.headers",
    );
    this.assignRequestField(req, "headers", headerResult.value);
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

  private normalizeBody(body: unknown): {
    readonly value: unknown;
    readonly findings: readonly TokenNormFinding[];
  } {
    const artifact = readGuardHumanApprovalArtifact(body);
    if (artifact === undefined) {
      return this.tokenNormService.normalize(body, "$.body");
    }

    const inspectionBody = replaceGuardHumanApprovalArtifact(
      body,
      "[human-approval-artifact]",
    );
    const result = this.tokenNormService.normalize(inspectionBody, "$.body");
    return {
      findings: result.findings,
      value: replaceGuardHumanApprovalArtifact(result.value, artifact),
    };
  }

  private elapsedSince(startedAt: number): number {
    return Math.max(0, performance.now() - startedAt);
  }

  private assignRequestField<K extends "query" | "headers">(
    req: TokenNormRequest,
    field: K,
    value: TokenNormRequest[K],
  ): void {
    if (this.canAssignRequestField(req, field)) {
      req[field] = value;
    }
  }

  private canAssignRequestField(
    req: TokenNormRequest,
    field: "query" | "headers",
  ): boolean {
    let target: object | null = req;
    while (target !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(target, field);
      if (descriptor !== undefined) {
        return descriptor.writable === true || descriptor.set !== undefined;
      }
      target = Object.getPrototypeOf(target);
    }

    return true;
  }
}

function readGuardHumanApprovalArtifact(body: unknown): unknown | undefined {
  if (!isRecord(body) || !isRecord(body.context)) {
    return undefined;
  }

  return Object.prototype.hasOwnProperty.call(body.context, "humanApproval")
    ? body.context.humanApproval
    : undefined;
}

function replaceGuardHumanApprovalArtifact(
  body: unknown,
  value: unknown,
): unknown {
  if (!isRecord(body) || !isRecord(body.context)) {
    return body;
  }

  return {
    ...body,
    context: {
      ...body.context,
      humanApproval: value,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
