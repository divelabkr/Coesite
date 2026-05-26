import { Module } from "@nestjs/common";

import { ProofGateModule } from "../proof-gate";
import { RedGateController } from "./red-gate.controller";
import { RedGateService } from "./red-gate.service";

@Module({
  controllers: [RedGateController],
  exports: [RedGateService],
  imports: [ProofGateModule],
  providers: [RedGateService],
})
export class RedGateModule {}
