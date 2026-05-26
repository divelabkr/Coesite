import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";

import { appendVerifiedJsonlRecord, loadAppendOnlyJsonl } from "../common/append-only-jsonl";
import { getMvpAppendPath } from "../common/mvp-runtime";

export const PROVENANCE_GENESIS_PREV_HASH = "GENESIS";

export interface ProvenanceAppendInput {
  readonly agentId: string;
  readonly payloadHash: string;
  readonly policyVersion: string;
  readonly runtimeVersion: string;
}

export interface ProvenanceRecord extends ProvenanceAppendInput {
  readonly createdAt: string;
  readonly prevHash: string;
  readonly hash: string;
}

export interface ProvenanceBreakResult {
  readonly intact: boolean;
  readonly requiresConsensus: boolean;
}

@Injectable()
export class ProvenanceChainService {
  private records: ProvenanceRecord[];
  private readonly appendPath = getMvpAppendPath("COESITE_PROVENANCE_APPEND_PATH");

  constructor() {
    this.records = loadAppendOnlyJsonl({
      appendPath: this.appendPath,
      errorCode: "provenance_append_log_invalid",
      isRecord: isProvenanceRecord,
      verify: verifyProvenanceRecords,
    });
  }

  append(input: ProvenanceAppendInput): ProvenanceRecord {
    if (this.appendPath !== undefined) {
      const result = appendVerifiedJsonlRecord({
        appendPath: this.appendPath,
        createRecord: (records) =>
          createProvenanceRecord(
            input,
            records[records.length - 1]?.hash ?? PROVENANCE_GENESIS_PREV_HASH,
          ),
        errorCode: "provenance_append_log_invalid",
        isRecord: isProvenanceRecord,
        verify: verifyProvenanceRecords,
      });
      this.records = [...result.records];
      return result.record;
    }

    const record = createProvenanceRecord(
      input,
      this.records[this.records.length - 1]?.hash ?? PROVENANCE_GENESIS_PREV_HASH,
    );
    this.records = [...this.records, record];
    return record;
  }

  verify(records: readonly ProvenanceRecord[] = this.records): boolean {
    return verifyProvenanceRecords(records);
  }

  detectBreak(records: readonly ProvenanceRecord[] = this.records): ProvenanceBreakResult {
    const intact = this.verify(records);
    return {
      intact,
      requiresConsensus: !intact,
    };
  }
}

function createProvenanceRecord(
  input: ProvenanceAppendInput,
  prevHash: string,
): ProvenanceRecord {
  const recordBase = {
    ...input,
    createdAt: new Date().toISOString(),
    prevHash,
  };
  return {
    ...recordBase,
    hash: createProvenanceHash(recordBase),
  };
}

function verifyProvenanceRecords(records: readonly ProvenanceRecord[]): boolean {
  let expectedPrevHash = PROVENANCE_GENESIS_PREV_HASH;
  for (const record of records) {
    if (record.prevHash !== expectedPrevHash) {
      return false;
    }

    const { hash: _hash, ...recordBase } = record;
    if (record.hash !== createProvenanceHash(recordBase)) {
      return false;
    }

    expectedPrevHash = record.hash;
  }

  return true;
}

function isProvenanceRecord(value: unknown): value is ProvenanceRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<ProvenanceRecord>;
  return (
    typeof record.agentId === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.hash === "string" &&
    typeof record.payloadHash === "string" &&
    typeof record.policyVersion === "string" &&
    typeof record.prevHash === "string" &&
    typeof record.runtimeVersion === "string"
  );
}

function createProvenanceHash(
  record: Omit<ProvenanceRecord, "hash">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        agentId: record.agentId,
        createdAt: record.createdAt,
        payloadHash: record.payloadHash,
        policyVersion: record.policyVersion,
        prevHash: record.prevHash,
        runtimeVersion: record.runtimeVersion,
      }),
    )
    .digest("hex");
}
