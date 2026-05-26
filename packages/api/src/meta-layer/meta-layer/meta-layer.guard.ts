import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";

import { extractCandidateTokens } from "../allowlist-gted";
import { MetaLayerService } from "./meta-layer.service";
import type { MetaLayerHttpRequest } from "./types";

@Injectable()
export class MetaLayerGuard implements CanActivate {
  constructor(
    @Inject(MetaLayerService)
    private readonly metaLayerService: MetaLayerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MetaLayerHttpRequest>();
    const evaluation = await this.metaLayerService.evaluate({
      candidateTokens: extractCandidateTokens(request),
      path: request.originalUrl ?? request.url ?? "unknown",
      payload: {
        body: request.body,
        query: request.query,
      },
      requestId: extractRequestId(request),
      sessionRef: extractSessionRef(request),
      sourceIp: extractSourceIp(request),
    });
    request.metaLayerMetadata = evaluation;

    if (evaluation.control === "DENY") {
      throw new ForbiddenException("request_rejected");
    }

    return true;
  }
}

function extractRequestId(request: MetaLayerHttpRequest): string {
  const bodyRequestId =
    request.body !== null && typeof request.body === "object"
      ? (request.body as Record<string, unknown>).requestId
      : undefined;

  return typeof bodyRequestId === "string" && bodyRequestId.trim() !== ""
    ? bodyRequestId
    : "request-unknown";
}

function extractSessionRef(request: MetaLayerHttpRequest): string {
  const value = request.headers?.["x-coesite-session"];
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "session-unknown";
}

function extractSourceIp(request: MetaLayerHttpRequest): string {
  return request.ip ?? request.socket?.remoteAddress ?? "0.0.0.0";
}
