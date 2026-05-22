import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { TokenNormMiddleware } from "./token-norm.middleware";
import { TokenNormService } from "./token-norm.service";

@Module({
  providers: [TokenNormService, TokenNormMiddleware],
  exports: [TokenNormService, TokenNormMiddleware],
})
export class TokenNormModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TokenNormMiddleware).forRoutes("*");
  }
}
