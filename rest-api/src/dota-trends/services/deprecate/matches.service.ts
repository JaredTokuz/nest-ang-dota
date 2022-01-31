import { ContextObject } from "./../models/context-object.interface";
import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from "@nestjs/common";
import { Collection, Filter } from "mongodb";
import { firstValueFrom } from "rxjs";
import { LIVE_MATCHES, MATCHES } from "../constants";
import { handleRequests } from "../../handle-request.decorator";
import { LiveGameDocument } from "../models/live-matches.interfaces";
import { delay } from "../../misc";
import { OpenDotaMatch } from "../models/open-dota-match-response.interface";

@Injectable()
export class MatchesService {
  constructor(
    @Inject(MATCHES)
    private matchCollection: Collection<OpenDotaMatch>,
    @Inject(LIVE_MATCHES)
    private liveMatchCollection: Collection<LiveGameDocument>,
    private httpService: HttpService
  ) {}

  /**
   * checks for live matches in the db that have not been parsed yet
   * and runs a parse on each of them
   * @returns success message on completion
   */
  async sync(ctx?: ContextObject) {
    try {
      /** ? DEPRECATE?? : Get the elgible live matches; get activate_time's that are older than an hour */
      // const hourAgoUnixTimestamp =
      //   Math.floor(new Date().getTime() / 1000) - 3600;
      const matches = await this.liveMatchCollection
        .find({
          $and: [
            { game_finished: { $ne: true } }
            // { activate_time: { $lt: hourAgoUnixTimestamp } },
          ]
        })
        .toArray();
      let counter = 0;
      for (const m of matches) {
        await this.parse(m.match_id)
          .then(val => {
            counter++;
          })
          .catch(e => {
            throw new Error(e);
          })
          .finally(async () => {
            await delay(2500);
          });
      }
      // ctx?.logger.log('log', `parsed thru ${counter} out of ${matches.length}`);
      return {
        successes: counter,
        total: matches.length
      };
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * gets the match data, checks if game finished if not set game finished
   * to false and exit, else formats for only the fields I want
   * and upserts to match collection, then updates the live
   * match with game finished
   * @param matchId match id of the dota match
   * @returns result of the live match collection update
   */
  @handleRequests(3000, 9)
  async parse(matchId: string) {
    try {
      const { data } = await firstValueFrom(this.httpService.get<OpenDotaMatch>(`matches/${matchId}`));
      console.log(`Retrieved match id ${matchId}`);
      /** check if the game finished by checking for radiant_win property and
       * the last array item from objectives for fort building
       */

      const gameFinished =
        data.radiant_win != undefined &&
        data.objectives &&
        data.objectives[(data.objectives as any[]).length - 1].key.includes("_fort");
      if (!gameFinished) {
        return await this.liveMatchCollection.updateOne(
          { match_id: matchId },
          {
            $set: {
              game_finished: false
            }
          }
        );
      }
      /** format the match data before upserting */
      const {
        match_id,
        radiant_win,
        cluster,
        duration,
        radiant_gold_adv,
        radiant_xp_adv,
        draft_timings,
        picks_bans,
        teamfights,
        players,
        patch
      } = data;
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

      const clippedData: OpenDotaMatch = {
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

      await this.matchCollection.updateOne(
        { match_id: match_id },
        {
          $set: clippedData
        },
        {
          upsert: true
        }
      );

      return await this.liveMatchCollection.updateOne(
        { match_id: matchId },
        {
          $set: {
            game_finished: true
          }
        }
      );
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * a simple query wrapper for the services only collection
   * @param query a filter operation to be used to query the collection
   * @returns an array of mongo documents matching the query
   */
  get(query: Filter<OpenDotaMatch>) {
    return this.matchCollection.find(query).toArray();
  }
}
