import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

import {
  OraclePreventionInterceptor,
  OraclePreventionModule,
  UniformErrorFilter,
} from "./common/oracle-prevention";
import { RequestClockModule } from "./common/request-clock";
import { ContractsModule } from "./contracts";
import { RedGateModule } from "./red-gate";
import { MetaLayerModule } from "./meta-layer/meta-layer";
import { TokenNormModule } from "./meta-layer/token-norm";
import { TrustCubeModule } from "./trust-cube";
import { TuringBoundaryModule } from "./turing";

@Module({
  imports: [
    RequestClockModule,
    OraclePreventionModule,
    TokenNormModule,
    MetaLayerModule,
    TuringBoundaryModule,
    TrustCubeModule,
    RedGateModule,
    ContractsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: OraclePreventionInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: UniformErrorFilter,
    },
  ],
})
export class AppModule {}
