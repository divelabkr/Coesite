import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";

import { M1GateService } from "./m1-gate.service";
import type {
  M1GateControl,
  M1GateEvaluation,
  M1GtedMetadata,
  M1HttpRequest,
} from "./types";

@Injectable()
export class M1Guard implements CanActivate {
  constructor(
    @Inject(M1GateService)
    private readonly m1GateService: M1GateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<M1HttpRequest>();
    const candidates = extractCandidateTokens(request);

    if (candidates.length === 0) {
      const evaluation: M1GateEvaluation = {
        control: "BLOCK",
        normalizedToken: "",
        reason: "no_candidate_tokens",
      };
      request.m1GtedMetadata = createMetadata("BLOCK", [evaluation]);
      throw new ForbiddenException("request_rejected");
    }

    const evaluations: M1GateEvaluation[] = [];
    for (const candidate of candidates) {
      evaluations.push(await this.m1GateService.evaluateToken(candidate));
    }

    const blocked = evaluations.find((evaluation) => evaluation.control === "BLOCK");
    if (blocked !== undefined) {
      request.m1GtedMetadata = createMetadata("BLOCK", evaluations);
      throw new ForbiddenException("request_rejected");
    }

    const observed = evaluations.find(
      (evaluation) => evaluation.control === "OBSERVE",
    );
    request.m1GtedMetadata = createMetadata(
      observed === undefined ? "PASS" : "OBSERVE",
      evaluations,
    );

    return true;
  }
}

export function extractCandidateTokens(request: M1HttpRequest): readonly string[] {
  const candidates: string[] = [];
  const headers = request.headers ?? {};
  addHeaderCandidate(candidates, headers["x-coesite-action"]);
  addObjectCandidate(candidates, request.body, "action");
  addObjectCandidate(candidates, request.body, "operation");
  addObjectCandidate(candidates, request.body, "scope");
  addObjectCandidate(candidates, request.body, "token");
  addObjectCandidate(candidates, request.query, "action");
  addRouteCandidate(candidates, request);

  return [...new Set(candidates.filter((candidate) => candidate.trim() !== ""))];
}

function addHeaderCandidate(
  candidates: string[],
  value: string | string[] | undefined,
): void {
  if (typeof value === "string") {
    candidates.push(value);
    return;
  }

  if (Array.isArray(value)) {
    candidates.push(...value.filter((item) => typeof item === "string"));
  }
}

function addObjectCandidate(
  candidates: string[],
  value: unknown,
  key: string,
): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate === "string") {
    candidates.push(candidate);
  }
}

function addRouteCandidate(candidates: string[], request: M1HttpRequest): void {
  const path = request.originalUrl ?? request.url;
  if (path === undefined || request.method === undefined) {
    return;
  }

  candidates.push(`${request.method} ${path.split("?")[0]}`);
}

function createMetadata(
  control: M1GateControl,
  evaluations: readonly M1GateEvaluation[],
): M1GtedMetadata {
  const primary = evaluations[0] ?? {
    control,
    normalizedToken: "",
    reason: "no_candidate_tokens" as const,
  };

  return {
    blocked: control === "BLOCK",
    control,
    evaluations,
    handoff: primary.handoff,
    inspectedAt: new Date().toISOString(),
    reason: primary.reason,
  };
}
