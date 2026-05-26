import { Module } from "@nestjs/common";

import { AllowListGtedModule } from "../allowlist-gted";
import { SemanticFirewallModule } from "../semantic-firewall";
import { SirenModule } from "../siren";
import { MetaLayerGuard } from "./meta-layer.guard";
import { MetaLayerService } from "./meta-layer.service";

@Module({
  imports: [AllowListGtedModule, SemanticFirewallModule, SirenModule],
  providers: [MetaLayerService, MetaLayerGuard],
  exports: [MetaLayerService, MetaLayerGuard],
})
export class MetaLayerModule {}
