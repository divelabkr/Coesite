import { Module } from "@nestjs/common";

import { DeceptionGateService } from "./deception-gate.service";
import { HoneypotService } from "./honeypot.service";
import { PolyintentService } from "./polyintent.service";
import { UtilityInversionService } from "./utility-inversion.service";

@Module({
  providers: [
    PolyintentService,
    UtilityInversionService,
    DeceptionGateService,
    HoneypotService,
  ],
  exports: [
    PolyintentService,
    UtilityInversionService,
    DeceptionGateService,
    HoneypotService,
  ],
})
export class SirenModule {}
