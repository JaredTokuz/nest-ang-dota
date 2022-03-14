import { Controller, Get, Inject, Logger, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { AuthenticationGuard } from '../../guards/authentication.guard';
import { makeContext } from './../../functions/context';
import { Db, WithId } from 'mongodb';
import { MatchesStore } from '../data-stores/matches.store';
import { DATABASE_CONNECTION, LIVE_MATCHES, LVL_TWO_HEROES, MATCHES } from '../database/database.provider';
import { LiveMatchStore } from '../data-stores/live-match.store';
import { ConstantsStore } from '../data-stores/constants.store';
import { TaskSchedulerService } from '../services/task-scheduler/task-scheduler.service';

// @UseGuards(AuthenticationGuard)
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);
  constructor(
    private readonly matchesStore: MatchesStore,
    @Inject(DATABASE_CONNECTION) private db: Db,
    private liveStore: LiveMatchStore,
    @Inject(ConstantsStore) private constantsStore: ConstantsStore,
    @Inject(TaskSchedulerService) private taskSchedulerService: TaskSchedulerService
  ) {
    this.logger.log('sync controller constructor');
  }

  @Get('crons')
  async getCrons() {
    return this.taskSchedulerService.getCronJobs();
  }

  /** TODO */
  @Post('constants')
  // @UseGuards(AdminGuard)
  async constantSync(@Query('constant') constant?: string) {
    return this.constantsStore.sync(constant);
  }

  @Post('live')
  // @UseGuards(AdminGuard)
  async liveMatchesSync() {
    return this.liveStore.sync({ ctx: this.makeCtx(), payload: {} }).subscribe();
  }

  /** this will resync all live matches that are not finished and conditional delay */
  @Post('live/retry')
  // @UseGuards(AdminGuard)
  async liveMatchesRetry() {
    return this.liveStore.emitUnfinished({ ctx: this.makeCtx(), payload: {} }).subscribe();
  }

  /** only sync if it is a live match */
  @Post('match/:id')
  // @UseGuards(AdminGuard)
  async matchesParseLiveMatchesOnly(@Param('id') id: string) {
    return this.matchesStore.liveMatchOnlyParse$(id, this.makeCtx()).subscribe();
  }

  private makeCtx() {
    return makeContext(this.db.collection('dblogger'));
  }
}
