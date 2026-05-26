import { createHash, timingSafeEqual } from "node:crypto";

import { Controller, ForbiddenException, Get, HttpCode, Param, Req } from "@nestjs/common";
import type { CoesiteProofBundleView } from "@coesite/types";

import { getMvpRedGateAuditKeys } from "../common/mvp-runtime";
import { RedGateService } from "./red-gate.service";

interface RedGateHttpRequest {
  readonly headers?: Record<string, string | readonly string[] | undefined>;
}

@Controller("/v1/redgate")
export class RedGateController {
  constructor(private readonly redGateService: RedGateService) {}

  @Get("/proofs/:requestId")
  @HttpCode(200)
  getProof(
    @Param("requestId") requestId: string,
    @Req() httpRequest: RedGateHttpRequest,
  ): CoesiteProofBundleView {
    assertAuditAuthorized(httpRequest);

    const normalizedRequestId = normalizeAuditRequestId(requestId);
    const proof = this.redGateService.getProofByRequestId(normalizedRequestId);
    if (proof === undefined) {
      throw new ForbiddenException("request_rejected");
    }

    return proof;
  }
}

function normalizeAuditRequestId(requestId: string): string {
  const normalized = requestId.trim();
  if (normalized === "" || normalized.length > 128) {
    throw new ForbiddenException("request_rejected");
  }

  return normalized;
}

function assertAuditAuthorized(httpRequest: RedGateHttpRequest): void {
  const authorization = getHeader(httpRequest, "authorization");
  const token =
    authorization?.startsWith("Bearer ") === true
      ? authorization.slice("Bearer ".length).trim()
      : undefined;
  if (token === undefined) {
    throw new ForbiddenException("request_rejected");
  }

  if (!getMvpRedGateAuditKeys().some((key) => safeEqual(key, token))) {
    throw new ForbiddenException("request_rejected");
  }
}

function getHeader(
  httpRequest: RedGateHttpRequest,
  name: string,
): string | undefined {
  const headers = httpRequest.headers;
  if (headers === undefined) {
    return undefined;
  }

  const direct = headers[name];
  const value =
    direct ??
    headers[
      Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase()) ??
        name
    ];
  return typeof value === "string" ? value : value?.[0];
}

function safeEqual(expected: string, actual: string): boolean {
  return timingSafeEqual(sha256(expected), sha256(actual));
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
