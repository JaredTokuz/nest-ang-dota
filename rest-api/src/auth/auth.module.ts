import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { UsersSchema } from "./users.schema";
import { databaseProviders } from "./database.provider";

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [...databaseProviders],
  exports: [...databaseProviders]
})
export class AuthModule {}
