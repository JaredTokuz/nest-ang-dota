import { LiveGame } from "../../models/live-matches.interfaces";
import { ContextObject, DataPass } from "./../../models/context-object.interface";
import { OpenDotaService } from "./../../services/open-dota.service";
import { OpenDotaMatchResponse } from "./../../models/open-dota-match-response.interface";
import { LIVE_MATCHES, MATCHES } from "./../../constants";
import { Inject, Injectable } from "@nestjs/common";
import {
  BehaviorSubject,
  concatAll,
  concatMap,
  delay,
  from,
  map,
  Observable,
  of,
  Subject,
  tap,
  throttleTime
} from "rxjs";
import { Collection } from "mongodb";
import { LiveMatchRepo } from "../live-match/live-match.repo";
import { LiveGameDocument } from "../../models/live-matches.interfaces";

export type MatchPass = DataPass<OpenDotaMatchResponse>;

@Injectable()
export class MatchesRepo {
  private subject = new Subject<MatchPass>();
  match$: Observable<MatchPass> = this.subject.asObservable();

  private requestSubject = new Subject<ContextObject>();

  constructor(
    @Inject(MATCHES)
    private readonly matchCollection: Collection<OpenDotaMatchResponse>,
    @Inject(LIVE_MATCHES)
    private liveMatchCollection: Collection<LiveGameDocument>,
    private readonly opendota: OpenDotaService,
    private readonly liveRepo: LiveMatchRepo
  ) {
    this.liveRepo.liveMatches$
      .pipe(
        map(val => {
          const { data, ...ctx } = val;
          /** inject the ctx in every live game */
          return data.map(game => {
            return {
              data: game,
              ctx
            };
          });
        }),
        /** reshapes the single obs array value into an array of individual obs values */
        concatAll(),
        /** process one at a time with a delay */
        concatMap(val => {
          return this.parse(val.data.match_id, false, val.ctx).pipe(delay(2000));
        })
      )
      .subscribe();

    this.requestSubject
      .asObservable()
      .pipe(
        throttleTime(1000 * 15),
        map(ctx => {
          return this.pushAll(ctx);
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
  parse(matchId: string, force = false, ctx?: ContextObject) {
    try {
      return from(
        this.matchCollection.findOne({ match_id: matchId }).then(val => {
          if (val && !force) {
            return;
          }

          return this.opendota.matches(matchId).pipe(
            //   console.log(`Retrieved match id ${matchId}`);
            tap(() => ctx.logger.log("info", "open dota match complete", { value: matchId })),
            map(match => {
              /** check if the game finished by checking for radiant_win property and
               * the last array item from objectives for fort building
               */
              const gameFinished =
                match.radiant_win != undefined &&
                match.objectives &&
                match.objectives[(match.objectives as any[]).length - 1].key.includes("_fort");
              if (!gameFinished) {
                /** Break out and return this value */
                ctx.logger.log("info", "game not finished", { value: match.objectives });
                return from(
                  this.matchCollection
                    .updateOne(
                      { match_id: match.match_id },
                      {
                        $currentDate: { idsyncDate: true },
                        $set: {
                          match_id: match.match_id,
                          objectives: match.objectives
                        }
                      },
                      {
                        upsert: true
                      }
                    )
                    .then(res => {
                      ctx.logger.log("info", "mongo update not finished ");
                      return res;
                    })
                    .catch(err => {
                      ctx.logger.log("error", "game not finished => update one => failed", { msg: err.toString() });
                    })
                );
              }
              ctx.logger.log("info", "check game finished complete");
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
                radiant_win
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
                  benchmarks: p.benchmarks
                };
              });

              const clippedData: OpenDotaMatchResponse = {
                match_id,
                radiant_win,
                cluster,
                duration,
                radiant_gold_adv,
                radiant_xp_adv,
                draft_timings,
                picks_bans,
                patch,
                teamfights: clippedTeamfights,
                players: clippedPlayers
              };
              ctx.logger.log("info", "clipping match data complete");
              let title = "matches";
              return from(
                this.matchCollection
                  .updateOne(
                    { match_id: match_id },
                    {
                      $currentDate: { idsyncDate: true },
                      $set: clippedData
                    },
                    {
                      upsert: true
                    }
                  )
                  .then(() => {
                    title = "live matches";
                    return this.liveMatchCollection.updateOne(
                      { match_id: matchId },
                      {
                        $currentDate: { matchsyncDate: true },
                        $set: {
                          game_finished: true
                        }
                      }
                    );
                  })
                  .catch(err => {
                    ctx.logger.log("error", `mongo updates match parse`, { title: title, msg: err.toString() });
                  })
              ).pipe(
                tap(() => {
                  ctx.logger.log("info", "mongo 2 upsert/update match/livegame complete");
                  this.subject.next({ data: clippedData, ...ctx });
                })
              );

              /** end map */
            })
          );
        })
      );
    } catch (e) {
      throw new Error(e);
    }
  }

  pushAll(ctx: ContextObject) {
    return from(
      this.matchCollection
        .find({})
        .forEach(doc => {
          this.subject.next({ data: doc, ...ctx });
        })
        .finally(() => {
          ctx.logger.log("info", "matches push all complete");
        })
    );
  }
}
