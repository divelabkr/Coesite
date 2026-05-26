import { createHash } from "node:crypto";

import { Inject, Injectable, Optional } from "@nestjs/common";

import { appendVerifiedJsonlRecord, loadAppendOnlyJsonl } from "../../common/append-only-jsonl";
import { getMvpAppendPath } from "../../common/mvp-runtime";
import {
  SIREN_OPTIONS,
  type HoneypotAccessInput,
  type HoneypotAccessRecord,
  type HoneypotOptions,
  type HoneypotRoute,
  type HoneypotRouteContext,
  type PolyintentResult,
} from "./types";

const DEFAULT_MAX_ROUTES = 8;
const GENESIS_PREV_HASH = "GENESIS";

@Injectable()
export class HoneypotService {
  private readonly appendPath: string | undefined;
  private readonly maxRoutes: number;
  private readonly now: () => Date;
  private readonly knownPaths = new Set<string>();
  private accessRecords: HoneypotAccessRecord[];

  constructor(
    @Optional()
    @Inject(SIREN_OPTIONS)
    options: HoneypotOptions = {},
  ) {
    this.appendPath =
      options.appendPath ?? getMvpAppendPath("COESITE_HONEYPOT_APPEND_PATH");
    this.maxRoutes = options.maxRoutes ?? DEFAULT_MAX_ROUTES;
    this.now = options.now ?? (() => new Date());
    this.accessRecords = loadAppendOnlyJsonl({
      appendPath: this.appendPath,
      errorCode: "honeypot_append_log_invalid",
      isRecord: isHoneypotAccessRecord,
      verify: verifyHoneypotAccessRecords,
    });
  }

  get records(): readonly HoneypotAccessRecord[] {
    return [...this.accessRecords];
  }

  isKnownPath(path: string): boolean {
    return this.knownPaths.has(path);
  }

  createRoutes(
    result: PolyintentResult,
    context: HoneypotRouteContext,
  ): readonly HoneypotRoute[] {
    if (result.route !== "DECEPTION_GATE") {
      return [];
    }

    const routes = result.intents
      .filter((intent) => intent.category !== "benign_task")
      .slice(0, this.maxRoutes)
      .map((intent) => {
        const routeId = hashValue(
          `route:${context.requestId}:${intent.category}`,
        ).slice(0, 16);
        const path = `/__siren/${routeId}`;
        this.knownPaths.add(path);
        return {
          category: intent.category,
          path,
          routeId,
        };
      });

    return routes;
  }

  recordAccess(input: HoneypotAccessInput): HoneypotAccessRecord {
    if (!this.knownPaths.has(input.path)) {
      throw new Error("unknown honeypot path");
    }

    if (this.appendPath !== undefined) {
      const result = appendVerifiedJsonlRecord({
        appendPath: this.appendPath,
        createRecord: (records) =>
          createHoneypotAccessRecord(
            input,
            records[records.length - 1]?.hash ?? GENESIS_PREV_HASH,
            this.now,
          ),
        errorCode: "honeypot_append_log_invalid",
        isRecord: isHoneypotAccessRecord,
        verify: verifyHoneypotAccessRecords,
      });
      this.accessRecords = [...result.records];
      return result.record;
    }

    const record = createHoneypotAccessRecord(
      input,
      this.accessRecords[this.accessRecords.length - 1]?.hash ?? GENESIS_PREV_HASH,
      this.now,
    );
    this.accessRecords = [...this.accessRecords, record];
    return record;
  }

  verifyChain(records: readonly HoneypotAccessRecord[] = this.accessRecords): boolean {
    return verifyHoneypotAccessRecords(records);
  }
}

function createHoneypotAccessRecord(
  input: HoneypotAccessInput,
  prevHash: string,
  now: () => Date,
): HoneypotAccessRecord {
  const recordBase = {
    createdAt: now().toISOString(),
    path: input.path,
    prevHash,
    requestId: input.requestId,
    sessionRefHash: hashValue(`session:${input.sessionRef}`).slice(0, 32),
    sourceIpHash: hashValue(`ip:${input.sourceIp}`).slice(0, 32),
  };
  return {
    ...recordBase,
    hash: createRecordHash(recordBase),
  };
}

function verifyHoneypotAccessRecords(
  records: readonly HoneypotAccessRecord[],
): boolean {
  let expectedPrevHash = GENESIS_PREV_HASH;
  for (const record of records) {
    if (record.prevHash !== expectedPrevHash) {
      return false;
    }

    const { hash: _hash, ...recordBase } = record;
    if (record.hash !== createRecordHash(recordBase)) {
      return false;
    }

    expectedPrevHash = record.hash;
  }

  return true;
}

function isHoneypotAccessRecord(value: unknown): value is HoneypotAccessRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<HoneypotAccessRecord>;
  return (
    typeof record.createdAt === "string" &&
    typeof record.hash === "string" &&
    typeof record.path === "string" &&
    typeof record.prevHash === "string" &&
    typeof record.requestId === "string" &&
    typeof record.sessionRefHash === "string" &&
    typeof record.sourceIpHash === "string"
  );
}

function createRecordHash(
  record: Omit<HoneypotAccessRecord, "hash">,
): string {
  return hashValue(
    JSON.stringify({
      createdAt: record.createdAt,
      path: record.path,
      prevHash: record.prevHash,
      requestId: record.requestId,
      sessionRefHash: record.sessionRefHash,
      sourceIpHash: record.sourceIpHash,
    }),
  );
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
