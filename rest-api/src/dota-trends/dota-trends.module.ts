import { OPENDOTA_BASE_URL } from "./constants";
import { LevelTwoMatchesRepo } from "./repositories/level-two-matches/level-two-matches.repo";
import { LiveMatchRepo } from "./repositories/live-match/live-match.repo";
import { SyncController } from "./controllers/sync.controller";
import { DotaConstantsController } from "./controllers/dota-constants.controller";
import { DatabaseModule } from "./database/database.module";
import { Module } from "@nestjs/common";
import { MatchesRepo } from "./repositories/matches/matches.repo";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [DotaConstantsController, SyncController],
  providers: [LiveMatchRepo, MatchesRepo, LevelTwoMatchesRepo]
})
export class DotaTrendsModule {}
