import { standardCatchErrorStrategy } from '../../functions/standard-catch-error-strategy';
import {
  Context,
  ErrorObj,
  ErrorProcessResponse,
  ProcessResponse,
  ProcessTrace,
  SuccessProcessResponse,
  TypeProcessResponseError
} from '../../interfaces/process';
import { OpenDotaLiveResponse, LiveGameDocument, LiveGame } from '../interfaces/live-matches';
import { OpenDotaService } from '../services/open-dota.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Collection, WithId } from 'mongodb';

import {
  catchError,
  concatMap,
  debounceTime,
  from,
  map,
  Observable,
  of,
  share,
  shareReplay,
  Subject,
  tap,
  throttleTime
} from 'rxjs';
import { LIVE_MATCHES } from '../database/database.provider';

/** going in */
type GenericProcessTrace = ProcessTrace<{}>;

/** going out */
type LiveMatchesResponse = LiveGame[];
type ErrorResponse = {};
export type SuccessLiveMatchResponse = ProcessResponse<LiveMatchesResponse, 'success'>;
export type ErrorLiveMatchResponse = ProcessResponse<ErrorResponse, 'error'>;
export type LiveMatchResponses = SuccessLiveMatchResponse | ErrorLiveMatchResponse;

@Injectable()
export class LiveMatchStore {
  private readonly logger = new Logger(LiveMatchStore.name);
  /** for finished data to emit out to consumers */
  private subject = new Subject<LiveMatchResponses>();
  processed$ = this.subject.asObservable().pipe(share());

  constructor(
    @Inject(LIVE_MATCHES)
    private readonly liveMatchCollection: Collection<LiveGameDocument>,
    private readonly opendota: OpenDotaService
  ) {}

  /**
   * emit the unfinished fields
   * @param ctx
   * @returns
   */
  public emitUnfinished(
    { ctx, payload }: GenericProcessTrace,
    dateDelay: Date = new Date(+new Date() - 1000 * 60 * 15)
  ) {
    return standardCatchErrorStrategy({
      ob$: from(
        this.liveMatchCollection
          .find({
            $and: [{ game_finished: { $ne: true } }, { syncDate: { $lt: dateDelay } }]
          })
          .toArray()
          .then(res => {
            ctx.dbLogger.log('log', 'retry matches', { res });
            return SuccessProcessResponse(res, ctx);
          })
      ),
      pt: { ctx, payload }
    }).pipe(tap(data => this.subject.next(data)));
  }

  /**
   * @param ctx
   * @returns
   */
  public sync({ ctx, payload }: GenericProcessTrace) {
    ctx.dbLogger.log('log', 'live matches sync start');
    return standardCatchErrorStrategy({
      ob$: this.opendota.liveMatches().pipe(
        // concatMap is one at atime
        tap(() => ctx.dbLogger.log('log', 'open dota live matches request')),
        concatMap(res => {
          const data = res.filter(x => x.average_mmr > 8000);
          return from(
            this.liveMatchCollection.bulkWrite(
              data.map(x_1 => {
                return {
                  updateOne: {
                    filter: { match_id: x_1.match_id },
                    update: {
                      $currentDate: { syncDate: true },
                      $set: {
                        match_id: x_1.match_id,
                        activate_time: x_1.activate_time,
                        game_finished: null
                      }
                    },
                    upsert: true
                  }
                };
              })
            )
          ).pipe(
            tap(bulkWriteRes => {
              ctx.dbLogger.log('log', 'bulkwrite complete', { data, mongo: bulkWriteRes });
            }),
            map(() => SuccessProcessResponse(data, ctx))
          );
        })
      ),
      pt: { ctx, payload }
    }).pipe(tap(response => this.subject.next(response)));
  }
}
