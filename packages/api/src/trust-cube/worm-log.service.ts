import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";

import { appendVerifiedJsonlRecord, loadAppendOnlyJsonl } from "../common/append-only-jsonl";
import { getMvpAppendPath } from "../common/mvp-runtime";

const WORM_LOG_GENESIS_PREV_HASH = "GENESIS";

export type WormLogLevel = "INFO" | "WARN";

export interface WormLogInput {
  readonly level: WormLogLevel;
  readonly message: string;
  readonly source: string;
}

export interface WormLogRecord extends WormLogInput {
  readonly createdAt: string;
  readonly prevHash: string;
  readonly hash: string;
}

@Injectable()
export class WormLogService {
  private wormRecords: WormLogRecord[];
  private readonly appendPath = getMvpAppendPath("COESITE_WORM_APPEND_PATH");

  constructor() {
    this.wormRecords = loadAppendOnlyJsonl({
      appendPath: this.appendPath,
      errorCode: "worm_append_log_invalid",
      isRecord: isWormLogRecord,
      verify: verifyWormLogRecords,
    });
  }

  get records(): readonly WormLogRecord[] {
    return this.wormRecords;
  }

  append(input: WormLogInput): WormLogRecord {
    if (this.appendPath !== undefined) {
      const result = appendVerifiedJsonlRecord({
        appendPath: this.appendPath,
        createRecord: (records) =>
          createWormLogRecord(
            input,
            records[records.length - 1]?.hash ?? WORM_LOG_GENESIS_PREV_HASH,
          ),
        errorCode: "worm_append_log_invalid",
        isRecord: isWormLogRecord,
        verify: verifyWormLogRecords,
      });
      this.wormRecords = [...result.records];
      return result.record;
    }

    const record = createWormLogRecord(
      input,
      this.wormRecords[this.wormRecords.length - 1]?.hash ?? WORM_LOG_GENESIS_PREV_HASH,
    );
    this.wormRecords = [...this.wormRecords, record];
    return record;
  }

  verify(records: readonly WormLogRecord[] = this.wormRecords): boolean {
    return verifyWormLogRecords(records);
  }
}

function createWormLogRecord(input: WormLogInput, prevHash: string): WormLogRecord {
  const recordBase = {
    ...input,
    createdAt: new Date().toISOString(),
    prevHash,
  };
  return {
    ...recordBase,
    hash: createWormLogHash(recordBase),
  };
}

function verifyWormLogRecords(records: readonly WormLogRecord[]): boolean {
  let expectedPrevHash = WORM_LOG_GENESIS_PREV_HASH;
  for (const record of records) {
    if (record.prevHash !== expectedPrevHash) {
      return false;
    }

    const { hash: _hash, ...recordBase } = record;
    if (record.hash !== createWormLogHash(recordBase)) {
      return false;
    }

    expectedPrevHash = record.hash;
  }

  return true;
}

function isWormLogRecord(value: unknown): value is WormLogRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<WormLogRecord>;
  return (
    (record.level === "INFO" || record.level === "WARN") &&
    typeof record.createdAt === "string" &&
    typeof record.hash === "string" &&
    typeof record.message === "string" &&
    typeof record.prevHash === "string" &&
    typeof record.source === "string"
  );
}

function createWormLogHash(record: Omit<WormLogRecord, "hash">): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        createdAt: record.createdAt,
        level: record.level,
        message: record.message,
        prevHash: record.prevHash,
        source: record.source,
      }),
    )
    .digest("hex");
}
