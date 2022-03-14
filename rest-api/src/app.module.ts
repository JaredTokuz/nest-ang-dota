import { SyncController } from './dota-trends/controllers/sync.controller';
import { DotaConstantsController } from './dota-trends/controllers/dota-constants.controller';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DotaTrendsModule } from './dota-trends/dota-trends.module';
import { AuthModule } from './auth/auth.module';
import { GetUserMiddleware } from './middleware/get-user.middleware';
import { PingController } from './ping.controller';
import * as Joi from 'joi';
import * as path from 'path';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

export interface ENV_VARIABLES {
  NODE_ENV: 'production' | 'development' | 'test';
  DOTA_MONGO_URI: string;
}

console.log('checking ...' + path.join(__dirname, `../../env/${process.env.NODE_ENV}.env`));

@Module({
  imports: [
    DotaTrendsModule,
    HttpModule,
    AuthModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test', 'provision').default('development')
      }),
      validationOptions: {
        abortEarly: true
      },
      ignoreEnvFile:
        process.env.IGNORE_ENV_FILE === 'false' ? false : true /** env set thru docker run --env-file <file-path>  */,
      envFilePath: path.join(
        __dirname,
        `../../env/${process.env.NODE_ENV}.env`
      ) /** need to cast NODE_ENV=development outside for this */,
      cache: true
    })
  ],
  controllers: [PingController],
  providers: []
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GetUserMiddleware).forRoutes(DotaConstantsController, SyncController);
  }
}
