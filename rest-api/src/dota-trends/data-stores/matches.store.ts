import { dbCheckFirst } from '../../functions/db-check-first';
import { standardCatchErrorStrategy } from '../../functions/standard-catch-error-strategy';
import {
  Context,
  ProcessTrace,
  SuccessProcessResponse,
  errorObj,
  TypeProcessResponseSuccess,
  TypeProcessResponseError
} from '../../interfaces/process';
import { LiveGame } from '../interfaces/live-matches';
import { OpenDotaService } from '../services/open-dota.service';
import { OpenDotaMatch } from '../interfaces/open-dota-match';

import { Inject, Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { concat, concatMap, delay, from, Observable, of, share, Subject, tap } from 'rxjs';
import { Collection } from 'mongodb';
import { LiveMatchStore } from './live-match.store';
import { LiveGameDocument } from '../interfaces/live-matches';
import { isString } from '../../functions/guards';
import { LIVE_MATCHES, MATCHES } from '../database/database.provider';

type matchId = Pick<LiveGame, 'match_id'>;

/** going in */
type MatchIdProcessTrace = ProcessTrace<matchId>;

/** going out */
type LiveMatchesResponse = OpenDotaMatch;
type ErrorResponse = string;
export type SuccessMatchResponse = TypeProcessResponseSuccess<LiveMatchesResponse>;
export type ErrorMatchResponse = TypeProcessResponseError<ErrorResponse>;
export type MatchResponses = SuccessMatchResponse | ErrorMatchResponse;

@Injectable()
export class MatchesStore implements OnModuleInit {
  private subject = new Subject<MatchResponses>();
  processed$: Observable<MatchResponses> = this.subject.asObservable().pipe(share());

  constructor(
    @Inject(MATCHES) private readonly matchCollection: Collection<OpenDotaMatch>,
    @Inject(LIVE_MATCHES) private liveMatchCollection: Collection<LiveGameDocument>,
    @Inject(OpenDotaService) private readonly opendota: OpenDotaService,
    @Inject(LiveMatchStore) private readonly live: LiveMatchStore
  ) {}

  onModuleInit() {
    this.live.processed$
      .pipe(
        concatMap(val => {
          if (val.status == 'success') {
            return concat(
              ...val.payload.map(({ match_id, ...rest }) => {
                return this.parse$(match_id, val.ctx).pipe(delay(2000));
              })
            );
          } else {
            return of();
          }
        })
      )
      .subscribe();
  }

  /**
   * Gets match from opendota, then clips the data, then upserts to matches and
   * updates live matches collection
   * @param matchId
   * @returns
   */
  parse$(match_id: string, ctx: Context) {
    return standardCatchErrorStrategy({
      ob$: from(this.opendota.matches(match_id)).pipe(
        //   console.log(`Retrieved match id ${matchId}`);
        tap(() => ctx.dbLogger.log('log', 'open dota match complete', { value: match_id })),
        concatMap(match => {
          /** check if the game finished by checking for radiant_win property and
           * the last array item from objectives for fort building
           */
          const last_objective = match.objectives[(match.objectives as any[]).length - 1];
          const fort_dead =
            match.objectives && isString(last_objective.key) ? last_objective.key.includes('_fort') : false;

          const gameFinished = match.radiant_win != undefined && fort_dead;
          if (!gameFinished) {
            /** throw error and update livematch syncdate*/
            ctx.dbLogger.log('log', 'game not finished', { value: match.objectives });
            return from(
              this.liveMatchCollection
                .updateOne(
                  { match_id: match.match_id.toString() },
                  {
                    $currentDate: { syncDate: true }
                  }
                )
                .then(() => {
                  throw errorObj({ err: new Error('game not finished') });
                })
            );
          }
          ctx.dbLogger.log('log', 'check game finished complete');
          /** format the match data before upserting */
          const {
            match_id,
            cluster,
            duration,
            radiant_gold_adv,
            radiant_xp_adv,
            draft_timings,
            picks_bans,
            teamfights,
            players,
            patch,
            radiant_win,
            objectives
          } = match;
          const clippedTeamfights = teamfights.map(tf => {
            const clippedTeamfightsPlayers = tf.players.map(tfp => {
              return {
                ability_uses: tfp.ability_uses,
                item_uses: tfp.item_uses,
                killed: tfp.killed,
                deaths: tfp.deaths,
                buybacks: tfp.buybacks,
                damage: tfp.damage,
                healing: tfp.healing,
                gold_delta: tfp.gold_delta,
                xp_delta: tfp.xp_delta,
                xp_start: tfp.xp_start
              };
            });
            return {
              start: tf.start,
              end: tf.end,
              players: clippedTeamfightsPlayers
            };
          });

          const clippedPlayers = players.map(p => {
            return {
              player_slot: p.player_slot,
              ability_targets: p.ability_targets,
              ability_upgrades_arr: p.ability_upgrades_arr,
              ability_uses: p.ability_uses,
              account_id: p.account_id,
              actions: p.actions,
              assists: p.assists,
              buyback_log: p.buyback_log,
              camps_stacked: p.camps_stacked,
              connection_log: p.connection_log,
              creeps_stacked: p.creeps_stacked,
              damage: p.damage,
              damage_inflictor: p.damage_inflictor,
              damage_inflictor_received: p.damage_inflictor_received,
              damage_taken: p.damage_taken,
              damage_targets: p.damage_targets,
              deaths: p.deaths,
              dn_t: p.dn_t,
              firstblood_claimed: p.firstblood_claimed,
              gold_per_min: p.gold_per_min,
              gold_reasons: p.gold_reasons,
              gold_spent: p.gold_spent,
              gold_t: p.gold_t,
              hero_damage: p.hero_damage,
              hero_healing: p.hero_healing,
              hero_hits: p.hero_hits,
              hero_id: p.hero_id,
              item_uses: p.item_uses,
              kill_streaks: p.kill_streaks,
              killed: p.killed,
              killed_by: p.killed_by,
              kills: p.kills,
              kills_log: p.kills_log,
              lh_t: p.lh_t,
              life_state: p.life_state,
              obs_left_log: p.obs_left_log,
              obs_log: p.obs_log,
              party_id: p.party_id,
              party_size: p.party_size,
              permanent_buffs: p.permanent_buffs,
              purchase_log: p.purchase_log,
              runes_log: p.runes_log,
              sen_left_log: p.sen_left_log,
              sen_log: p.sen_log,
              stuns: p.stuns,
              teamfight_participation: p.teamfight_participation,
              tower_damage: p.tower_damage,
              towers_killed: p.towers_killed,
              xp_per_min: p.xp_per_min,
              xp_reasons: p.xp_reasons,
              xp_t: p.xp_t,
              courier_kills: p.courier_kills,
              kills_per_min: p.kills_per_min,
              neutral_kills: p.neutral_kills,
              lane_kills: p.lane_kills,
              hero_kills: p.hero_kills,
              ancient_kills: p.ancient_kills,
              tower_kills: p.tower_kills,
              roshan_kills: p.roshan_kills,
              lane: p.lane,
              lane_role: p.lane_role,
              observer_kills: p.observer_kills,
              sentry_kills: p.sentry_kills,
              is_roaming: p.is_roaming,
              item_usage: p.item_usage,
              life_state_dead: p.life_state_dead,
              actions_per_min: p.actions_per_min,
              lane_efficiency: p.lane_efficiency,
              benchmarks: p.benchmarks,
              times: p.times,
              isRadiant: p.isRadiant,
              win: p.win,
              lose: p.lose
            };
          });

          const clippedData: OpenDotaMatch = {
            match_id,
            radiant_win,
            cluster,
            duration,
            radiant_gold_adv,
            radiant_xp_adv,
            draft_timings,
            picks_bans,
            objectives,
            patch,
            teamfights: clippedTeamfights,
            players: clippedPlayers
          };
          ctx.dbLogger.log('log', 'clipping match data complete');

          return from(
            this.matchCollection
              .updateOne(
                { match_id: match_id },
                {
                  $currentDate: { syncDate: true },
                  $set: clippedData
                },
                {
                  upsert: true
                }
              )
              .then(() => {
                return this.liveMatchCollection.updateOne(
                  { match_id: match_id.toString() },
                  {
                    $currentDate: { syncDate: true },
                    $set: {
                      game_finished: true
                    }
                  }
                );
              })
              .then(res => {
                ctx.dbLogger.log('log', 'mongo 2 upsert/update match/livegame complete');
                return SuccessProcessResponse(clippedData, ctx);
              })
          );
          /** end map */
        })
      ),
      pt: { ctx, payload: match_id }
    }).pipe(
      tap(res => {
        this.subject.next(res);
      })
    );
  }

  /**
   * This one checks live matches collection if null throw else parse
   * @param match_id
   * @param ctx
   */
  liveMatchOnlyParse$(match_id: string, ctx: Context, throwSwitch = true) {
    return dbCheckFirst({
      collection: this.liveMatchCollection,
      query: { match_id },
      ifDbFindOb$: this.parse$(match_id, ctx),
      throwSwitch
    });
  }

  /**
   * this is for consumers of the level one match which is why it is individually added
   * @param ctx
   * @returns
   */
  emitAll(ctx: Context) {
    return from(
      this.matchCollection
        .find({})
        .forEach(doc => {
          this.subject.next(SuccessProcessResponse(doc, ctx));
        })
        .finally(() => {
          ctx.dbLogger.log('log', 'matches push all complete');
        })
    );
  }
}
