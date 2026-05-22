import { createHash } from "node:crypto";

export class EmlFailClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmlFailClosedError";
  }
}

export function eml(x: number, y: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) {
    throw new EmlFailClosedError("invalid EML input");
  }

  const value = Math.exp(x) - Math.log(y);
  if (!Number.isFinite(value)) {
    throw new EmlFailClosedError("invalid EML result");
  }

  return value;
}

export function emlHex(x: number, y: number): string {
  return createHash("sha256")
    .update(eml(x, y).toString())
    .digest("hex")
    .slice(0, 32);
}
