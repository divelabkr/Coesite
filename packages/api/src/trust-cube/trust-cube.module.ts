import { Module } from "@nestjs/common";

import { OraclePreventionModule } from "../common/oracle-prevention";
import { getMvpPolicyHmacKey } from "../common/mvp-runtime";
import { MetaLayerModule } from "../meta-layer/meta-layer";
import { TokenNormModule } from "../meta-layer/token-norm";
import { TuringBoundaryModule } from "../turing";
import { ComplyGateService, TRUST_CUBE_OPTIONS } from "./comply-gate.service";
import { ConsensusGateService } from "./consensus-gate.service";
import { DmsService, IncidentGovernorService } from "./dms.service";
import { RuntimeSeyerGateService } from "./runtime-seyer-gate.service";
import { SeyerGateService } from "./seyer-gate.service";
import { TrustMetabolismService } from "./trust-metabolism.service";
import { WormLogService } from "./worm-log.service";

@Module({
  imports: [
    OraclePreventionModule,
    TokenNormModule,
    MetaLayerModule,
    TuringBoundaryModule,
  ],
  providers: [
    {
      provide: TRUST_CUBE_OPTIONS,
      useFactory: () => ({ hmacKey: getMvpPolicyHmacKey() }),
    },
    ComplyGateService,
    ConsensusGateService,
    DmsService,
    IncidentGovernorService,
    TrustMetabolismService,
    WormLogService,
    SeyerGateService,
    RuntimeSeyerGateService,
  ],
  exports: [
    ComplyGateService,
    ConsensusGateService,
    DmsService,
    IncidentGovernorService,
    TrustMetabolismService,
    WormLogService,
    SeyerGateService,
    RuntimeSeyerGateService,
  ],
})
export class TrustCubeModule {}
