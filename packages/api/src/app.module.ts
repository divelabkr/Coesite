import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

import {
  OraclePreventionInterceptor,
  OraclePreventionModule,
  UniformErrorFilter,
} from "./common/oracle-prevention";
import { TokenNormModule } from "./meta-layer/token-norm";

@Module({
  imports: [OraclePreventionModule, TokenNormModule],
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
