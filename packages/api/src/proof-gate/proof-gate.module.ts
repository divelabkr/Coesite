import { Module } from "@nestjs/common";

import { PreviewBudgetService } from "./preview-budget.service";
import { ProofBundleService } from "./proof-bundle.service";
import { ReleaseContractService } from "./release-contract.service";

@Module({
  exports: [PreviewBudgetService, ProofBundleService, ReleaseContractService],
  providers: [PreviewBudgetService, ProofBundleService, ReleaseContractService],
})
export class ProofGateModule {}
