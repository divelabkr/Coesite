import { Inject, Injectable } from "@nestjs/common";
import type { CoesiteProofBundleView } from "@coesite/types";

import { ProofBundleService } from "../proof-gate";
import type { ProofBundleRecord } from "../proof-gate";

@Injectable()
export class RedGateService {
  constructor(
    @Inject(ProofBundleService)
    private readonly proofBundleService: ProofBundleService,
  ) {}

  getProofByRequestId(requestId: string): CoesiteProofBundleView | undefined {
    const record = this.proofBundleService.findByRequestId(requestId);
    return record === undefined ? undefined : toProofView(record);
  }
}

function toProofView(record: ProofBundleRecord): CoesiteProofBundleView {
  return {
    action: record.action,
    bundleId: record.bundleId,
    contractHash: record.contractHash,
    control: record.control,
    createdAt: record.createdAt,
    evidence: record.evidence,
    hash: record.hash,
    policyVersion: record.policyVersion,
    prevHash: record.prevHash,
    receiptPayloadHash: record.receiptPayloadHash,
    requestId: record.requestId,
    resourceHash: record.resourceHash,
    runtimeVersion: record.runtimeVersion,
    subjectRefHash: record.subjectRefHash,
  };
}
