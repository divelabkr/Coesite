import { Inject, Injectable, Optional } from "@nestjs/common";

import { emlHex } from "./eml.util";
import {
  DEFAULT_SEGMENT_SIZE_BYTES,
  createPaddedJsonBody,
} from "./size-padding.util";
import {
  ORACLE_PREVENTION_OPTIONS,
  type OracleHttpResponse,
  type OraclePreventionOptions,
  type OracleRejectionFinding,
} from "./types";

const DEFAULT_MINIMUM_ELAPSED_MS = 200;
const REJECTION_STATUS = 403;
const DUMMY_EML = "00000000000000000000000000000000";

@Injectable()
export class OraclePreventionService {
  private readonly minimumElapsedMs: number;
  private readonly segmentSizeBytes: number;

  constructor(
    @Optional()
    @Inject(ORACLE_PREVENTION_OPTIONS)
    options: OraclePreventionOptions = {},
  ) {
    this.minimumElapsedMs =
      options.minimumElapsedMs ?? DEFAULT_MINIMUM_ELAPSED_MS;
    this.segmentSizeBytes =
      options.segmentSizeBytes ?? DEFAULT_SEGMENT_SIZE_BYTES;
  }

  async padSuccess(
    res: OracleHttpResponse,
    body: unknown,
    startedAt = performance.now(),
  ): Promise<void> {
    const statusCode = res.statusCode === 201 ? 201 : 200;
    const responseBody = createPaddedJsonBody(body, this.segmentSizeBytes);

    await this.padElapsed(startedAt);
    this.writeResponse(res, statusCode, responseBody, DUMMY_EML);
  }

  async padAndReject(
    res: OracleHttpResponse,
    finding: OracleRejectionFinding = { source: "unknown" },
    startedAt = performance.now(),
  ): Promise<void> {
    const responseBody = createPaddedJsonBody(
      { error: "request_rejected" },
      this.segmentSizeBytes,
    );
    const emlHeader = this.createRejectionEmlHeader(finding);

    await this.padElapsed(startedAt);
    this.writeResponse(res, REJECTION_STATUS, responseBody, emlHeader);
  }

  isSuccessStatus(statusCode: number | undefined): boolean {
    return statusCode === 200 || statusCode === 201 || statusCode === undefined;
  }

  private writeResponse(
    res: OracleHttpResponse,
    statusCode: number,
    body: string,
    emlHeader: string,
  ): void {
    if (res.headersSent === true) {
      console.error("oracle-prevention headers already sent");
      return;
    }

    res.status(statusCode);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.setHeader("content-encoding", "identity");
    res.setHeader("x-coesite-eml", emlHeader);
    res.setHeader("x-coesite-oracle", "uniform-v1");
    res.setHeader("content-length", Buffer.byteLength(body).toString());
    res.end(body);
  }

  private createRejectionEmlHeader(finding: OracleRejectionFinding): string {
    const sourceWeight = Math.max(1, finding.source.length);
    const statusWeight = Math.max(1, finding.statusCode ?? REJECTION_STATUS);

    return emlHex(Math.log(sourceWeight + 1), statusWeight);
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
