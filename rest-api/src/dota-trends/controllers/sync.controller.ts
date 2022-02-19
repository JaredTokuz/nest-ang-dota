import { Controller, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { AuthenticationGuard } from '../../guards/authentication.guard';
import { DbLoggerMainFields } from './../../interfaces/db-logger';
import { generalPaginatedSync } from './../../functions/general-paginated-sync';
import { makeContext } from './../../functions/context';
import { ProcessTrace, SuccessProcessResponse } from './../../interfaces/process';
import { LevelTwoHero } from '../interfaces/level-two-match';
import { daysToMs, unixTimestamp } from '../../misc';
import { Cron } from '@nestjs/schedule';
import { Db, WithId } from 'mongodb';
import { LiveGameDocument } from '../interfaces/live-matches';
import { OpenDotaMatch } from '../interfaces/open-dota-match';
import { from } from 'rxjs';
import { MatchesStore } from '../data-stores/matches.store';
import { DATABASE_CONNECTION, LIVE_MATCHES, LVL_TWO_HEROES, MATCHES } from '../database/database.provider';
import { LiveMatchStore } from '../data-stores/live-match.store';
import { ConstantsStore } from '../data-stores/constants.store';
import { DOTA_DBLOGGER } from '../constants';

@Controller('sync')
@UseGuards(AuthenticationGuard)
export class SyncController {
  constructor(
    private readonly matchesStore: MatchesStore,
    @Inject(DATABASE_CONNECTION)
    private db: Db,
    private liveStore: LiveMatchStore,
    private constantsStore: ConstantsStore
  ) {}

  @Cron('0 0 */2 ? * *')
  async liveMatchSync() {
    this.liveStore.sync({ ctx: this.makeCtx(), payload: {} }).subscribe();
  }

  @Cron('0 0 * */6 * sun')
  async newsundayMaintenance() {
    /** Setup */
    const ctx = this.makeCtx();

    /** TASK 1 = Expiring the liveMatches & matches */
    let taskName = 'Expiring the liveMatches & matches';
    try {
      /** run main job */
      const liveMatchesCollection = this.db.collection<LiveGameDocument>(LIVE_MATCHES);
      const matchesCollection = this.db.collection<OpenDotaMatch>(MATCHES);
      const levelTwoHeroes = this.db.collection<LevelTwoHero>(LVL_TWO_HEROES);

      /** 30 days */
      let days = 30;
      const d = new Date(+new Date() - daysToMs(days));
      const unixTime = unixTimestamp(d);

      /** delete the matches that are ready to expire */
      await liveMatchesCollection.deleteMany({ activate_time: { $lte: unixTime } }).then(async val => {
        ctx.dbLogger.log('log', `${taskName} deleteMany from ${LIVE_MATCHES} ${val}`, val);
      });

      /** check and delete match_ids that have been removed from live matches collection
       */
      const expireRecordsFn$ = ({ payload, ctx }: ProcessTrace<WithId<OpenDotaMatch>[]>) => {
        const batch = payload.map(({ match_id }) => match_id.toString());

        return from(
          liveMatchesCollection
            .find({ match_id: { $in: batch } })
            .toArray()
            .then(found => {
              const found_match_ids = found.map(({ match_id }) => match_id);
              const not_found = batch.filter(x => !found_match_ids.includes(x));
              const n = not_found.map(x => Number(x));
              return matchesCollection.deleteMany({ match_id: { $in: n } });
            })
            .then(response => {
              return SuccessProcessResponse(response, ctx);
            })
        );
      };

      generalPaginatedSync({
        limit: 40,
        query: {},
        timeout: 30,
        ctx,
        collection: matchesCollection,
        processArrayFn$: expireRecordsFn$
      });

      /** delete level two match data here as well  */
      const expireRecordsLvlTwoFn$ = ({ payload, ctx }: ProcessTrace<WithId<LevelTwoHero>[]>) => {
        const batch = payload.map(({ match_id }) => match_id.toString());

        return from(
          liveMatchesCollection
            .find({ match_id: { $in: batch } })
            .toArray()
            .then(found => {
              const found_match_ids = found.map(({ match_id }) => match_id);
              const not_found = batch.filter(x => !found_match_ids.includes(x));
              const n = not_found.map(x => Number(x));
              return levelTwoHeroes.deleteMany({ match_id: { $in: n } });
            })
            .then(response => {
              return SuccessProcessResponse(response, ctx);
            })
        );
      };

      generalPaginatedSync({
        limit: 40,
        query: {},
        timeout: 30,
        ctx,
        collection: levelTwoHeroes,
        processArrayFn$: expireRecordsLvlTwoFn$
      });

      ctx.dbLogger.log('log', `Complete: ${taskName} ${days} days old`);
    } catch (e) {
      /** catch on error */
      ctx.dbLogger.log('log', `Failed: ${taskName}`, { err: e.toString() });
    }

    /** TASK 2 = Expiring the logs collection(s) */
    taskName = 'Expire Logs';
    try {
      let days = 30;
      const d = new Date(+new Date() - daysToMs(days));

      await this.db
        .collection<DbLoggerMainFields>(DOTA_DBLOGGER)
        .deleteMany({ createdAt: { $lte: d } })
        .then(async val => {
          /** then on success */
          ctx.dbLogger.log('log', `Complete: ${taskName} ${d} month old`, val);
        })
        .catch(async e => {
          /** catch on error */
          ctx.dbLogger.log('log', `Failed: ${taskName} ${e.toString()}`);
        });
    } catch (e) {
      /** catch on error */
      ctx.dbLogger.log('log', `Failed: ${taskName}`, { err: e.toString() });
    }
  }

  /** TODO */
  @Post('constants')
  @UseGuards(AdminGuard)
  async constantSync(@Query('constant') constant?: string) {
    return this.constantsStore.sync(constant);
  }

  @Post('live')
  @UseGuards(AdminGuard)
  async liveMatchesSync() {
    return this.liveStore.sync({ ctx: this.makeCtx(), payload: {} }).subscribe();
  }

  /** this will resync all live matches that are not finished and conditional delay */
  @Post('live/retry')
  @UseGuards(AdminGuard)
  async liveMatchesRetry() {
    return this.liveStore.emitUnfinished({ ctx: this.makeCtx(), payload: {} }).subscribe();
  }

  /** only sync if it is a live match */
  @Post('match/:id')
  @UseGuards(AdminGuard)
  async matchesParseLiveMatchesOnly(@Param('id') id: string) {
    return this.matchesStore.liveMatchOnlyParse$(id, this.makeCtx()).subscribe();
  }

  private makeCtx() {
    return makeContext(this.db.collection('dblogger'));
  }
}
