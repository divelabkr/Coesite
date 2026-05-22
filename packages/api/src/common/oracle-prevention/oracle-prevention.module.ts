import { Module } from "@nestjs/common";

import { OraclePreventionService } from "./oracle-prevention.service";

@Module({
  providers: [OraclePreventionService],
  exports: [OraclePreventionService],
})
export class OraclePreventionModule {}
