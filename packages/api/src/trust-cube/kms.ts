import { createHmac } from "node:crypto";

import { Injectable } from "@nestjs/common";

export interface Signature {
  readonly keyId: string;
  readonly value: string;
}

export interface KmsAdapter {
  readonly keyId: string;
  sign(payload: string): Promise<Signature>;
  verify(payload: string, signature: Signature): Promise<boolean>;
}

export interface MultiRootResult {
  readonly control: "DENY" | "PASS";
  readonly passed: number;
  readonly failed: number;
}

@Injectable()
export class LocalKmsAdapter implements KmsAdapter {
  constructor(
    readonly keyId: string,
    private readonly hmacKey: string,
    private readonly shouldThrow = false,
  ) {}

  async sign(payload: string): Promise<Signature> {
    if (this.shouldThrow) {
      throw new Error("kms unavailable");
    }

    return {
      keyId: this.keyId,
      value: createSignature(payload, this.hmacKey),
    };
  }

  async verify(payload: string, signature: Signature): Promise<boolean> {
    if (this.shouldThrow) {
      throw new Error("kms unavailable");
    }

    return createSignature(payload, this.hmacKey) === signature.value;
  }
}

@Injectable()
export class MultiRootService {
  constructor(private readonly adapters: readonly KmsAdapter[]) {}

  async verify(payload: string, signature: Signature): Promise<MultiRootResult> {
    let passed = 0;
    let failed = 0;

    for (const adapter of this.adapters) {
      try {
        if (await adapter.verify(payload, signature)) {
          passed += 1;
        } else {
          failed += 1;
        }
      } catch (_error) {
        failed += 1;
      }
    }

    return {
      control: passed >= 2 && failed <= 1 ? "PASS" : "DENY",
      failed,
      passed,
    };
  }
}

function createSignature(payload: string, hmacKey: string): string {
  return createHmac("sha256", hmacKey).update(payload).digest("hex");
}
