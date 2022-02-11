import { ContextObject, DataPass } from "../models/context-object.interface";
import { OpenDotaLiveResponse, LiveGameDocument, LiveGame } from "../models/live-matches.interfaces";
import { OpenDotaService } from "../services/open-dota.service";
import { Inject, Injectable } from "@nestjs/common";
import { Collection } from "mongodb";
import { LIVE_MATCHES } from "../constants";
import { concatMap, debounceTime, from, map, Observable, shareReplay, Subject, tap, throttleTime } from "rxjs";

export type LiveMatchPass = DataPass<LiveGame[]>;
export type SyncPass = DataPass<"new" | "retry">;

@Injectable()
export class LiveMatchRepo {
  private subject = new Subject<LiveMatchPass>();
  liveMatches$: Observable<LiveMatchPass> = this.subject.asObservable();

  private requestSubject = new Subject<SyncPass>();
  /** internal observable */

  constructor(
    @Inject(LIVE_MATCHES)
    private readonly liveMatchCollection: Collection<LiveGameDocument>,
    private readonly opendota: OpenDotaService
  ) {
    this.requestSubject
      .asObservable()
      .pipe(
        throttleTime(1000 * 15),
        map(val => {
          if (val.data == "new") return this.sync(val);
          if (val.data == "retry") return this.retryAny(false, val);
        })
      )
      .subscribe();
  }

  /**
   * How the frontend requests a new sync
   * @param ctx
   */
  requestSync(ctx: SyncPass) {
    this.requestSubject.next(ctx);
  }

  /**
   * @param ctx
   * @returns
   */
  retryAny(force?: boolean, ctx?: ContextObject) {
    return from(
      this.liveMatchCollection
        .find({
          $and: [{ game_finished: { $ne: true } }, { syncDate: { $lt: +new Date() - 1000 * 60 * 15 } }]
        })
        .toArray()
    ).pipe(
      tap(data => {
        ctx.logger.log("info", "retry matches", { data });
        this.subject.next({ ...ctx, data });
      })
    );
    //   .subscribe({
    //     complete: () => ctx
    //   });
  }

  /**
   * @param ctx
   * @returns
   */
  private sync(ctx?: ContextObject) {
    ctx.logger.log("info", "live matches sync start");
    // return
    this.opendota.liveMatches().pipe(
      // concatMap is one at atime
      tap(() => ctx.logger.log("info", "open dota live matches request")),
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
            ctx.logger.log("info", "bulkwrite complete", { data, mongo: bulkWriteRes });
            this.subject.next({ ...ctx, data: res });
          })
        );
      })
    );
    //   .subscribe();
  }
}
