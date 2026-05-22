export type TokenNormReason =
  | "unicode_nfkc"
  | "zero_width"
  | "bidi_control"
  | "homoglyph"
  | "base64"
  | "url_decode"
  | "double_url_decode";

export interface TokenNormFinding {
  readonly path: string;
  readonly reason: TokenNormReason;
  readonly original: string;
  readonly normalized: string;
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
}
