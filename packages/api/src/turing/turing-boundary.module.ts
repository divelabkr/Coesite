import { Module } from "@nestjs/common";

import { CognitiveFingerprintService } from "./cognitive-fingerprint.service";
import { HumanGateService } from "./human-gate.service";
import { ProvenanceChainService } from "./provenance-chain.service";
import { SessionBudgetService } from "./session-budget.service";
import {
  ImmuneIsolationService,
  ShadowModeService,
} from "./shadow-mode.service";
import { VelocityThrottleService } from "./velocity-throttle.service";

@Module({
  providers: [
    CognitiveFingerprintService,
    ProvenanceChainService,
    VelocityThrottleService,
    SessionBudgetService,
    ShadowModeService,
    ImmuneIsolationService,
    HumanGateService,
  ],
  exports: [
    CognitiveFingerprintService,
    ProvenanceChainService,
    VelocityThrottleService,
    SessionBudgetService,
    ShadowModeService,
    ImmuneIsolationService,
    HumanGateService,
  ],
})
export class TuringBoundaryModule {}
