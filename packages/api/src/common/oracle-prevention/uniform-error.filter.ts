import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Injectable,
} from "@nestjs/common";

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
    const response = host.switchToHttp().getResponse<OracleHttpResponse>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;

    await this.oraclePrevention.padAndReject(response, {
      source: "exception",
      statusCode,
      reason: exception instanceof Error ? exception.name : typeof exception,
    });
  }
}
