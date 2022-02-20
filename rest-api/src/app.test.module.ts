import { SyncController } from './dota-trends/controllers/sync.controller';
import { DotaConstantsController } from './dota-trends/controllers/dota-constants.controller';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GetUserMiddleware } from './middleware/get-user.middleware';
import { PingController } from './ping.controller';
import * as Joi from 'joi';
import * as path from 'path';
import { DatabaseModule } from './dota-trends/database/database.module';
import { HttpModule, HttpService } from '@nestjs/axios';

export interface ENV_VARIABLES {
  NODE_ENV: 'production' | 'development' | 'test';
  DOTA_MONGO_URI: string;
}

@Module({
  imports: [
    // AuthModule,
    // DatabaseModule,
    // HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('test').default('test')
      }),
      envFilePath: path.join(__dirname, '../env/test.env'),
      cache: true
    })
  ]
  // exports: [DatabaseModule, HttpModule]
})
export class AppTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GetUserMiddleware).forRoutes(DotaConstantsController, SyncController);
  }
}
