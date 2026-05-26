import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { RequestClockMiddleware } from "./request-clock.middleware";

@Module({
  providers: [RequestClockMiddleware],
  exports: [RequestClockMiddleware],
})
export class RequestClockModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestClockMiddleware).forRoutes("*");
  }
}
