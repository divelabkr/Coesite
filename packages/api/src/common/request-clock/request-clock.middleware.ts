import { Injectable, type NestMiddleware } from "@nestjs/common";

export const COESITE_REQUEST_CLOCK_STARTED_AT = Symbol.for(
  "coesite.requestClockStartedAt",
);

export interface RequestClockRequest {
  [COESITE_REQUEST_CLOCK_STARTED_AT]?: number;
  coesiteRequestClockStartedAt?: number;
}

@Injectable()
export class RequestClockMiddleware implements NestMiddleware {
  use(req: RequestClockRequest, _res: unknown, next: () => void): void {
    markRequestClock(req);
    next();
  }
}

export function markRequestClock(
  req: RequestClockRequest,
  startedAt = performance.now(),
): void {
  req[COESITE_REQUEST_CLOCK_STARTED_AT] = startedAt;
  req.coesiteRequestClockStartedAt = startedAt;
}

export function getRequestClockStartedAt(req: unknown): number | undefined {
  if (req === null || typeof req !== "object") {
    return undefined;
  }

  const request = req as RequestClockRequest;
  const symbolValue = request[COESITE_REQUEST_CLOCK_STARTED_AT];
  if (isValidStartedAt(symbolValue)) {
    return symbolValue;
  }

  const legacyValue = request.coesiteRequestClockStartedAt;
  return isValidStartedAt(legacyValue) ? legacyValue : undefined;
}

function isValidStartedAt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
