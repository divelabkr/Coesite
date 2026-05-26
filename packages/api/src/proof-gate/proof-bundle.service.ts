import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { CoesiteEvidenceRef, CoesiteGuardResponse } from "@coesite/types";
import {
  WORM_GENESIS_PREV_HASH,
  buildWormAppendEnvelope,
} from "@coesite/utils";
import type { WormCanonicalPartition } from "@coesite/utils";

import { appendVerifiedJsonlRecord, loadAppendOnlyJsonl } from "../common/append-only-jsonl";
import { getMvpAppendPath } from "../common/mvp-runtime";
import { ReleaseContractService } from "./release-contract.service";

export interface ProofBundleInput {
  readonly action: string;
  readonly policyVersion: string;
  readonly resource: string;
  readonly response: CoesiteGuardResponse;
  readonly runtimeVersion: string;
  readonly subjectRef: string;
}

export interface ProofBundleEvidenceDigest {
  readonly kind: CoesiteEvidenceRef["kind"];
  readonly refHash: string;
}

export interface ProofBundleRecord {
  readonly action: string;
  readonly bundleId: string;
  readonly contractHash: string;
  readonly control: CoesiteGuardResponse["control"];
  readonly createdAt: string;
  readonly evidence: readonly ProofBundleEvidenceDigest[];
  readonly hash: string;
  readonly partition: WormCanonicalPartition;
  readonly policyVersion: string;
  readonly prevHash: string;
  readonly receiptPayloadHash: string;
  readonly requestId: string;
  readonly resourceHash: string;
  readonly runtimeVersion: string;
  readonly subjectRefHash: string;
}

@Injectable()
export class ProofBundleService {
  private records: ProofBundleRecord[];
  private readonly appendPath = getMvpAppendPath("COESITE_PROOF_BUNDLE_APPEND_PATH");

  constructor(
    @Inject(ReleaseContractService)
    private readonly releaseContractService: ReleaseContractService,
  ) {
    this.records = loadAppendOnlyJsonl({
      appendPath: this.appendPath,
      errorCode: "proof_bundle_append_log_invalid",
      isRecord: isProofBundleRecord,
      verify: verifyProofBundleRecords,
    });
  }

  list(): readonly ProofBundleRecord[] {
    return [...this.records];
  }

  findByRequestId(requestId: string): ProofBundleRecord | undefined {
    return this.records.find((record) => record.requestId === requestId);
  }

  recordGuardDecision(input: ProofBundleInput): ProofBundleRecord {
    if (this.findByRequestId(input.response.requestId) !== undefined) {
      throw new Error("proof_bundle_duplicate_request_id");
    }

    const contract = this.releaseContractService.validate({
      action: input.action,
      resource: input.resource,
      response: input.response,
      subjectRef: input.subjectRef,
    });
    if (contract.control !== "PASS") {
      throw new Error(`release_contract_failed:${contract.reason ?? "unknown"}`);
    }

    if (this.appendPath !== undefined) {
      const result = appendVerifiedJsonlRecord({
        appendPath: this.appendPath,
        createRecord: (records) => {
          if (records.some((record) => record.requestId === input.response.requestId)) {
            throw new Error("proof_bundle_duplicate_request_id");
          }

          return createProofBundleRecord(
            input,
            contract.contractHash,
            records[records.length - 1]?.hash ?? WORM_GENESIS_PREV_HASH,
          );
        },
        errorCode: "proof_bundle_append_log_invalid",
        isRecord: isProofBundleRecord,
        verify: verifyProofBundleRecords,
      });
      this.records = [...result.records];
      return result.record;
    }

    const record = createProofBundleRecord(
      input,
      contract.contractHash,
      this.records[this.records.length - 1]?.hash ?? WORM_GENESIS_PREV_HASH,
    );
    this.records = [...this.records, record];
    return record;
  }

  verify(records: readonly ProofBundleRecord[] = this.records): boolean {
    return verifyProofBundleRecords(records);
  }
}

function createProofBundleRecord(
  input: ProofBundleInput,
  contractHash: string,
  prevHash: string,
): ProofBundleRecord {
  const createdAt = new Date().toISOString();
  const subjectRefHash = createDigest(input.subjectRef);
  const recordBase = {
    action: input.action,
    bundleId: createDigest({
      contractHash,
      createdAt,
      requestId: input.response.requestId,
    }),
    contractHash,
    control: input.response.control,
    createdAt,
    evidence: digestEvidence(input.response.evidence),
    partition: {
      field: "sessionId",
      value: subjectRefHash,
    } as const,
    policyVersion: input.policyVersion,
    prevHash,
    receiptPayloadHash: input.response.receipt.payloadHash,
    requestId: input.response.requestId,
    resourceHash: createDigest(input.resource),
    runtimeVersion: input.runtimeVersion,
    subjectRefHash,
  };
  const envelope = buildWormAppendEnvelope({
    createdAt,
    fields: createProofFields(recordBase),
    partition: recordBase.partition,
    prevHash,
    table: "ProofBundle",
  });
  return { ...recordBase, hash: envelope.hash };
}

function verifyProofBundleRecords(records: readonly ProofBundleRecord[]): boolean {
  let expectedPrevHash = WORM_GENESIS_PREV_HASH;
  const seenRequestIds = new Set<string>();
  for (const record of records) {
    if (seenRequestIds.has(record.requestId)) {
      return false;
    }
    seenRequestIds.add(record.requestId);

    if (record.prevHash !== expectedPrevHash) {
      return false;
    }

    const envelope = buildWormAppendEnvelope({
      createdAt: record.createdAt,
      fields: createProofFields(record),
      partition: record.partition,
      prevHash: record.prevHash,
      table: "ProofBundle",
    });
    if (envelope.hash !== record.hash) {
      return false;
    }

    expectedPrevHash = record.hash;
  }

  return true;
}

function createProofFields(
  record: Omit<ProofBundleRecord, "hash"> | ProofBundleRecord,
): Record<string, unknown> {
  return {
    action: record.action,
    bundleId: record.bundleId,
    contractHash: record.contractHash,
    control: record.control,
    evidence: record.evidence,
    policyVersion: record.policyVersion,
    receiptPayloadHash: record.receiptPayloadHash,
    requestId: record.requestId,
    resourceHash: record.resourceHash,
    runtimeVersion: record.runtimeVersion,
    subjectRefHash: record.subjectRefHash,
  };
}

function digestEvidence(
  evidence: readonly CoesiteEvidenceRef[],
): readonly ProofBundleEvidenceDigest[] {
  return evidence.map((item) => ({
    kind: item.kind,
    refHash: createDigest(item.ref),
  }));
}

function createDigest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function isProofBundleRecord(value: unknown): value is ProofBundleRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<ProofBundleRecord>;
  return (
    typeof record.action === "string" &&
    typeof record.bundleId === "string" &&
    typeof record.contractHash === "string" &&
    (record.control === "PROCEED" || record.control === "BLOCK") &&
    typeof record.createdAt === "string" &&
    Array.isArray(record.evidence) &&
    record.evidence.every(isProofEvidenceDigest) &&
    typeof record.hash === "string" &&
    isProofPartition(record.partition) &&
    typeof record.policyVersion === "string" &&
    typeof record.prevHash === "string" &&
    typeof record.receiptPayloadHash === "string" &&
    typeof record.requestId === "string" &&
    typeof record.resourceHash === "string" &&
    typeof record.runtimeVersion === "string" &&
    typeof record.subjectRefHash === "string"
  );
}

function isProofEvidenceDigest(value: unknown): value is ProofBundleEvidenceDigest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<ProofBundleEvidenceDigest>;
  return (
    (record.kind === "audit" ||
      record.kind === "policy" ||
      record.kind === "trace" ||
      record.kind === "worm") &&
    typeof record.refHash === "string"
  );
}

function isProofPartition(value: unknown): value is WormCanonicalPartition {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<WormCanonicalPartition>;
  return record.field === "sessionId" && typeof record.value === "string";
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJsonValue(value));
}

function normalizeJsonValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      normalized[key] = normalizeJsonValue((value as Record<string, unknown>)[key]);
    }
    return normalized;
  }

  throw new Error("unsupported proof bundle value");
}
