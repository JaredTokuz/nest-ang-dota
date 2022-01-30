import { Controller, Post, Query, UseGuards } from "@nestjs/common";
import { DotaConstantsSyncService } from "../services/dota-constants-sync.service";
import { AdminGuard } from "../../guards/admin.guard";
import { AuthenticationGuard } from "../../guards/authentication.guard";
import { LiveMatchesSyncService } from "../services/live-matches-sync.service";
import { MatchesService } from "../services/matches.service";

@Controller("sync")
@UseGuards(AuthenticationGuard)
export class SyncController {
  constructor(
    private readonly liveMatchesSyncService: LiveMatchesSyncService,
    private readonly dotaConstantsSyncService: DotaConstantsSyncService,
    private readonly matchesService: MatchesService
  ) {}

  @Post("constants")
  @UseGuards(AdminGuard)
  async constantSync(@Query("constant") constant?: string) {
    return await this.dotaConstantsSyncService.sync(constant);
  }

  @Post("live")
  @UseGuards(AdminGuard)
  async liveMatchesSync() {
    return await this.liveMatchesSyncService.sync();
  }

  @Post("matches")
  @UseGuards(AdminGuard)
  async matchesSync() {
    return await this.matchesService.sync();
  }
}
