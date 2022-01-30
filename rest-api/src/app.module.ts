import { SyncController } from "./dota-trends/controllers/sync.controller";
import { DotaConstantsController } from "./dota-trends/controllers/dota-constants.controller";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DotaTrendsModule } from "./dota-trends/dota-trends.module";
import { AuthModule } from "./auth/auth.module";
import { GetUserMiddleware } from "./middleware/get-user.middleware";

@Module({
  imports: [DotaTrendsModule, AuthModule]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GetUserMiddleware).forRoutes(DotaConstantsController, SyncController);
  }
}
