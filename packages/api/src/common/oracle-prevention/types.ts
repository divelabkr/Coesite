import type { TokenNormFinding } from "../../meta-layer/token-norm/types";

export interface OraclePreventionOptions {
  readonly minimumElapsedMs?: number;
  readonly segmentSizeBytes?: number;
  readonly maxBodyBytes?: number;
  readonly nonceProvider?: () => string;
}

export interface OracleRejectionFinding {
  readonly source: string;
  readonly statusCode?: number;
  readonly reason?: string;
  readonly tokenNormFinding?: TokenNormFinding;
}

export interface OracleHttpResponse {
  status(statusCode: number): OracleHttpResponse;
  setHeader(name: string, value: string): void;
  getHeaderNames?: () => string[];
  removeHeader?: (name: string) => void;
  destroy?: (error?: Error) => void;
  end(body?: string): void;
  statusCode?: number;
  headersSent?: boolean;
}

export const ORACLE_PREVENTION_OPTIONS = Symbol("ORACLE_PREVENTION_OPTIONS");
