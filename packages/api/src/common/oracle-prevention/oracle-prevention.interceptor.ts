import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from, mergeMap } from "rxjs";

import { getRequestClockStartedAt } from "../request-clock";
import { OraclePreventionService } from "./oracle-prevention.service";
import type { OracleHttpResponse } from "./types";

@Injectable()
export class OraclePreventionInterceptor implements NestInterceptor {
  constructor(
    @Inject(OraclePreventionService)
    private readonly oraclePrevention: OraclePreventionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<unknown>();
    const startedAt = getRequestClockStartedAt(request) ?? performance.now();
    const response = context.switchToHttp().getResponse<OracleHttpResponse>();

    return next.handle().pipe(
      mergeMap((body) =>
        from(this.writeUniformResponse(response, body, startedAt)),
      ),
    );
  }

  private async writeUniformResponse(
    response: OracleHttpResponse,
    body: unknown,
    startedAt: number,
  ): Promise<void> {
    if (this.oraclePrevention.isSuccessStatus(response.statusCode)) {
      await this.oraclePrevention.padSuccess(response, body, startedAt);
      return;
    }

    await this.oraclePrevention.padAndReject(
      response,
      {
        source: "non-success-status",
        statusCode: response.statusCode,
      },
      startedAt,
    );
  }
}
