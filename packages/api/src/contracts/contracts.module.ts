import { Module } from "@nestjs/common";

import { ProofGateModule } from "../proof-gate";
import { TrustCubeModule } from "../trust-cube";
import { TuringBoundaryModule } from "../turing";
import { GuardController } from "./guard.controller";

@Module({
  imports: [TrustCubeModule, TuringBoundaryModule, ProofGateModule],
  controllers: [GuardController],
})
export class ContractsModule {}
