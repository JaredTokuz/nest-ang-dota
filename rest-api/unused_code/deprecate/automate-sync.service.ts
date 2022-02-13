import { DbLoggerMainFields } from '../../src/interfaces/db-logger';
import { generalPaginatedSync } from '../../src/functions/general-paginated-sync';
import { makeContext } from '../../src/functions/context';
import { Context, ProcessResponse, ProcessTrace } from '../../src/interfaces/process';
import { LevelTwoHero } from '../../src/dota-trends/interfaces/level-two-match';
import { LiveMatchRepo } from '../../src/dota-trends/repositories/live-match.repo';
import { daysToMs, difference, unixTimestamp } from '../../src/misc';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DATABASE_CONNECTION, LIVE_MATCHES, LVL_TWO_HEROES, MATCHES } from '../../src/dota-trends/constants';
import { Db, WithId } from 'mongodb';
import { LiveGameDocument } from '../../src/dota-trends/interfaces/live-matches';
import { OpenDotaMatch } from '../../src/dota-trends/interfaces/open-dota-match';
import { ContextObject } from '../../interfaces/context-object';
import { DBLogger } from '../../src/classes/db-logger';
import { concat, from } from 'rxjs';
import { match } from 'assert';

/** Service that runs cron schedules.
 * Uses DbLogger & TaskRollUp to build lightweight logging solution
 */
@Injectable()
export class AutomateSyncService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: Db,
    private liveRepo: LiveMatchRepo
  ) {}

  @Cron('0 0 */2 ? * *')
  async liveMatchSync() {
    this.liveRepo.sync({ ctx: makeContext(this.db.collection('dblogger')), payload: {} }).subscribe();
  }

  @Cron('0 0 * */6 * sun')
  async newsundayMaintenance() {
    /** Setup */
    const ctx = makeContext(this.db.collection('dblogger'));

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
      const expireRecords$ = ({ payload, ctx }: ProcessTrace<WithId<OpenDotaMatch>[]>) => {
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
              return ProcessResponse('success', response, ctx);
            })
        );
      };

      generalPaginatedSync({
        limit: 40,
        query: {},
        timeout: 30,
        ctx,
        collection: matchesCollection,
        processArrayObs$: expireRecords$
      });

      /** delete level two match data here as well  */
      const expireRecordsLvlTwo$ = ({ payload, ctx }: ProcessTrace<WithId<LevelTwoHero>[]>) => {
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
              return ProcessResponse('success', response, ctx);
            })
        );
      };

      generalPaginatedSync({
        limit: 40,
        query: {},
        timeout: 30,
        ctx,
        collection: levelTwoHeroes,
        processArrayObs$: expireRecordsLvlTwo$
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
        .collection<DbLoggerMainFields>('dblogger')
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
}
