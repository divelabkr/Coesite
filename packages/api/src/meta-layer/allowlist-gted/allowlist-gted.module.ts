import { Module } from "@nestjs/common";

import { createMvpAllowListOptions } from "../../common/mvp-runtime";
import { AllowListPolicyService } from "./allowlist-policy.service";
import { GtedService } from "./gted.service";
import { M1GateService } from "./m1-gate.service";
import { M1Guard } from "./m1.guard";
import { ALLOWLIST_GTED_OPTIONS } from "./types";

@Module({
  providers: [
    {
      provide: ALLOWLIST_GTED_OPTIONS,
      useFactory: createMvpAllowListOptions,
    },
    AllowListPolicyService,
    GtedService,
    M1GateService,
    M1Guard,
  ],
  exports: [AllowListPolicyService, GtedService, M1GateService, M1Guard],
})
export class AllowListGtedModule {}
