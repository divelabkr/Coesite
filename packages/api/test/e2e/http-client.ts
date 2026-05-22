import type { INestApplication } from "@nestjs/common";

interface HttpRequestOptions {
  readonly method?: string;
  readonly path: string;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

export interface HttpResult {
  readonly statusCode: number;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: string;
  readonly durationMs: number;
}

export async function request(
  app: INestApplication,
  options: HttpRequestOptions,
): Promise<HttpResult> {
  const url = new URL(options.path, await app.getUrl());
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual",
  });
  const body = await response.text();
  const headers: Record<string, string | string[] | undefined> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body,
    durationMs: performance.now() - startedAt,
  };
}

export function headerValueLength(value: string | string[] | undefined): number {
  if (Array.isArray(value)) {
    return Buffer.byteLength(value.join(", "));
  }

  return Buffer.byteLength(value ?? "");
}
