import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Injectable,
} from "@nestjs/common";

import { getRequestClockStartedAt } from "../request-clock";
import { OraclePreventionService } from "./oracle-prevention.service";
import type { OracleHttpResponse } from "./types";

@Catch()
@Injectable()
export class UniformErrorFilter implements ExceptionFilter {
  constructor(
    @Inject(OraclePreventionService)
    private readonly oraclePrevention: OraclePreventionService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const response = http.getResponse<OracleHttpResponse>();
    const request = http.getRequest<{ originalUrl?: string; url?: string }>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const reason = exception instanceof Error ? exception.name : typeof exception;
    const metadata = {
      message: "redacted",
      name: reason,
      path: this.redactPath(request.originalUrl ?? request.url ?? "unknown"),
      stackPresent: exception instanceof Error && exception.stack !== undefined,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    console.error("oracle-prevention exception", metadata);

    const finding = {
      source: "exception",
      statusCode,
      reason,
    };
    const startedAt = getRequestClockStartedAt(request);

    if (startedAt === undefined) {
      await this.oraclePrevention.padAndReject(response, finding);
      return;
    }

    await this.oraclePrevention.padAndReject(response, finding, startedAt);
  }

  private redactPath(path: string): string {
    return path.split("?")[0] || "unknown";
  }
}
