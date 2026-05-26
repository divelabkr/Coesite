import { Module } from "@nestjs/common";

import { MirrorModelService } from "./mirror-model.service";
import { SemanticFirewallService } from "./semantic-firewall.service";

@Module({
  providers: [SemanticFirewallService, MirrorModelService],
  exports: [SemanticFirewallService, MirrorModelService],
})
export class SemanticFirewallModule {}
