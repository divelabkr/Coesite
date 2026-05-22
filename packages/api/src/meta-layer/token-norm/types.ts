export type TokenNormReason =
  | "unicode_nfkc"
  | "zero_width"
  | "bidi_control"
  | "homoglyph"
  | "base64"
  | "url_decode"
  | "double_url_decode"
  | "malformed_url"
  | "base64_expansion"
  | "max_depth_exceeded"
  | "convergence_failed";

export interface TokenNormFinding {
  readonly path: string;
  readonly reason: TokenNormReason;
  readonly original: string;
  readonly normalized: string;
  readonly metadata?: Record<string, unknown>;
}

export interface TokenNormMetadata {
  readonly blocked: boolean;
  readonly findings: readonly TokenNormFinding[];
  readonly inspectedAt: string;
  readonly elapsedMs: number;
}

export interface TokenNormResult<T> {
  readonly value: T;
  readonly findings: readonly TokenNormFinding[];
}

export interface TokenNormMiddlewareOptions {
  readonly minimumElapsedMs?: number;
}

export interface TokenNormHttpResponse {
  status(statusCode: number): TokenNormHttpResponse;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  statusCode?: number;
  headersSent?: boolean;
}
