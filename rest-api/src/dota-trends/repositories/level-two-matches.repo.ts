import {
  Faction,
  LevelTwoObjective,
  LevelTwoPlayerMapping,
  LevelTwoPlayerStamps,
  LevelTwoPlayerTeamfightMapping,
  LevelTwoPlayerTeamfightStamps,
  MinuteKeys,
  MinuteSnapShot,
  SkillBuild,
  Stamps,
  SumTypes
} from "../interfaces/level-two-match";
import { ContextObject } from "../interfaces/context-object";
import { MatchesRepo, MatchPass } from "./matches.repo";
import { Objective, Objectives, OpenDotaMatch, Player } from "../interfaces/open-dota-match";
import { LVL_TWO_HEROES, MATCHES } from "../constants";
import { Inject, Injectable } from "@nestjs/common";
import { BehaviorSubject, concatAll, concatMap, delay, from, map, Observable, of, tap } from "rxjs";
import { Collection } from "mongodb";
import { FirstbloodObj, LevelTwoHero, Role } from "../interfaces/level-two-match";

interface PreCalPlayer extends Player {
  calculatedRole: number;
  trilane?: boolean;
}

interface PreCalData extends OpenDotaMatch {
  players: PreCalPlayer[];
}

@Injectable()
export class LevelTwoMatchesRepo {
  private subject = new BehaviorSubject<OpenDotaMatch>(null);
  levelTwomatch$: Observable<OpenDotaMatch> = this.subject.asObservable();

  /** add another collection to a level two match coll  */
  constructor(
    @Inject(LVL_TWO_HEROES)
    private readonly levelTwoMatchCollection: Collection<LevelTwoHero>,
    @Inject(MATCHES)
    private readonly matchCollection: Collection<OpenDotaMatch>,
    private readonly matchesRepo: MatchesRepo
  ) {
    this.matchesRepo.match$
      .pipe(
        concatMap(val => {
          return this.calculate(val).pipe(delay(75));
        })
      )
      .subscribe();
  }

  calculate(val: MatchPass) {
    let { data, ...ctx } = val;
    ctx.logger.log("info", "calculate matches");
    const calculatedFields = {
      radiant_team: this.teamComp(data, "radiant"),
      dire_team: this.teamComp(data, "dire")
    };
    ctx.logger.log("info", "calculate complete");

    const _players = this.calculateRoles(data.players);
    const _data: PreCalData = {
      ...data,
      players: _players
    };
    const firstblood = this.firstblood(_data);
    const buildings = this.buildings(_data);
    const allStamps = this.stamps(_data);
    const objectives = this.objectives(_data);
    const killed_roles = this.killedRolesFactory(_players);

    return from(
      this.levelTwoMatchCollection.bulkWrite(
        _players.map((player, i) => {
          return {
            updateOne: {
              filter: { match_id: _data.match_id, hero_id: player.hero_id },
              update: {
                $set: {
                  syncDate: new Date(),
                  voted_bans: _data.draft_timings.map(x => x.hero_id),
                  teamfight_participation: player.teamfight_participation,
                  lane_efficiency: player.lane_efficiency,
                  benchmarks: player.benchmarks,
                  is_roaming: player.is_roaming,
                  calculated: {
                    team: player.isRadiant ? "radiant" : "dire",
                    role: player.calculatedRole as Role,
                    win: player.win ? true : false,
                    pick_order: _data.picks_bans.find(x => x.hero_id == player.hero_id).order,
                    firstblood,
                    buildings,
                    /** check purchase_log first, then item_usage */
                    starting_items: {
                      start: player.purchase_log.filter(x => x.time < 0).filter(x => player.item_usage[x.key] == 1),
                      first30: player.purchase_log
                        .filter(x => x.time >= 0 && x.time <= 30)
                        .filter(x => player.item_usage[x.key] == 1)
                    },
                    /** array find the correct stamp[] palyer_slot */
                    stamps: allStamps[i],
                    objectives: objectives[player.player_slot],
                    killed_roles: killed_roles(player),
                    items: this.items(player),
                    skillbuild: this.skillbuild(player)
                  }
                },
                $setOnInsert: {
                  match_id: _data.match_id,
                  hero_id: player.hero_id,
                  patch: _data.patch,
                  cluster: _data.cluster,
                  duration: _data.duration
                }
              },
              upsert: true
            }
          };
        })
      )
    );

    // return from(
    //   this.levelTwoMatchCollection
    //     .updateOne(
    //       { match_id: data.match_id, hero_id: data.he },
    //       {
    //         // $currentDate: { syncDate: true },
    //         $set: { levelTwo: calculatedFields }
    //       }
    //     )
    //     .then(() => {
    //       return this.matchCollection.deleteOne({ match_id: data.match_id });
    //     })
    //     .finally(() => {
    //       ctx.logger.log("info", "mongo update match with calculated");
    //     })
    // );
  }
  killedRolesFactory(_players: PreCalPlayer[]) {
    /** closure this data to be saved and used to perform hero id look ups */
    const players = _players;
    /** TODO inject the constant service to get hero id and other fields */
    return (player: Player) => {
      return player.kills_log.map(x => {
        return {
          inMinutesf: toFloatMinutes(x.time),
          npcName: x.key
        };
      });
    };
  }
  objectives(data: PreCalData) {
    const objectives: { [slot: number]: LevelTwoObjective[] } = {};
    for (const o of data.objectives) {
      if (!objectives[o.player_slot]) objectives[o.player_slot] = [];
      if (o.player_slot) {
        objectives[o.player_slot].push({
          inMinutesf: toFloatMinutes(o.time),
          type: o.type,
          key: o.key
        });
      }
    }
    return objectives;
  }
  skillbuild(player: PreCalPlayer) {
    let level = 0;
    const lvl_t = player.xp_t.map(x => this.toLevel(x));
    const skillbuild: SkillBuild[] = [];
    for (const [i, lvl] of lvl_t.entries()) {
      while (level < lvl) {
        skillbuild.push({
          minutes: toWholeMinutes(player.times[i]),
          level: level + 1,
          networth: player.gold_t[i],
          /** TODO ADD the actual skill name here using the id */
          skillId: player.ability_upgrades_arr[level]
        });
        level += 1;
      }
    }
    return skillbuild;
  }
  items(player: PreCalPlayer) {
    return player.purchase_log
      .filter(x => player.item_usage[x.key] == 1)
      .map(x => {
        const next_min = this.next_min(player, toWholeMinutes(x.time));
        return {
          time: x.time,
          name: x.key,
          inMinutesf: toFloatMinutes(x.time),
          networth: player.gold_t[next_min],
          level: this.toLevel(player.xp_t[next_min])
        };
      });
  }
  calculateRoles(players: Player[]): PreCalPlayer[] {
    const _players = players as PreCalPlayer[];
    /** sort gold at 8 minutes in order to easily handle default situations */
    _players.sort((a, b) => (a.gold_t[7] > b.gold_t[7] ? 1 : -1));
    for (const teamSwitch of [true, false]) {
      const team = _players.filter(x => x.isRadiant == teamSwitch);
      const deduplicate = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0
      };
      const safetrilane = team.filter(x => x.lane_role == 1).length == 3 ? true : false;
      const offtrilane = team.filter(x => x.lane_role == 3).length == 3 ? true : false;
      for (const [i, p] of team.entries()) {
        const _p = _players.find(x => x.player_slot == p.player_slot);
        if (i >= 3) {
          switch (p.lane_role) {
            case 1:
              if (safetrilane) _p.trilane = true;
              if (!deduplicate["1"]) {
                _p.calculatedRole = 1;
                deduplicate["1"] = 1;
                break;
              }
            case 2:
              if (!deduplicate["2"]) {
                _p.calculatedRole = 2;
                deduplicate["2"] = 1;
                break;
              }
            case 3:
              if (offtrilane) _p.trilane = true;
              if (!deduplicate["3"]) {
                _p.calculatedRole = 3;
                deduplicate["3"] = 1;
                break;
              }
            /** sometimes the lane_role doesnt work out pos1 and 2 could flip  */
            default:
              for (const [k, e] of Object.entries(deduplicate)) {
                if (e == 0) {
                  _p.calculatedRole = Number(k);
                  deduplicate[k] = 1;
                }
              }
          }
        } else {
          switch (p.lane_role) {
            case 1:
              if (safetrilane) {
                if (!deduplicate["4"]) _p.calculatedRole = 4;
                _p.trilane = true;
              } else {
                p.calculatedRole = 5;
              }
              break;
            case 3:
              if (offtrilane) _p.trilane = true;
              if (!deduplicate["4"]) {
                _p.calculatedRole = 4;
                break;
              }
            /** 2 could be the 4 */
            default:
              for (const [k, e] of Object.entries(deduplicate)) {
                if (e == 0) {
                  _p.calculatedRole = Number(k);
                  deduplicate[k] = 1;
                }
              }
          }
        }
      }
    }
    return _players;
  }

  private stamps(data: PreCalData) {
    const playerStamps = data.players.map(() => {
      return {};
    }) as Stamps[];

    /** these can match the index of _t arrays so nicely while being the minute */
    const minuteStamps = [1, 2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24] as MinuteKeys[]; /** 28,32,36,40 .. 45,50,55,60 */
    /** loop thru each minute in the timestamp */
    for (const min of minuteStamps) {
      /** pre cal fields */
      const prev_min = this.prev_min(minuteStamps, min);
      const _teamfights = {
        simple: data.teamfights.filter(x => x.start <= toSeconds(min)),
        diff: data.teamfights.filter(x => x.start > toSeconds(prev_min) && x.start <= toSeconds(min))
      };
      /** calculate each individual player data */
      for (const [i, player] of data.players.entries()) {
        playerStamps[i][min] = {} as MinuteSnapShot;
        playerStamps[i][min].simple = {} as LevelTwoPlayerMapping;
        playerStamps[i][min].simple.sum = {
          networth: player.gold_t[min],
          xp: player.xp_t[min],
          level: this.toLevel(player.xp_t[min]),
          kills: player.kills_log.filter(x => x.time <= toSeconds(min)).length,
          lh: player.lh_t[min],
          denies: player.dn_t[min],
          obs: player.obs_log.filter(x => x.time <= toSeconds(min)).length,
          sents: player.sen_log.filter(x => x.time <= toSeconds(min)).length,
          obs_coord: player.obs_log
            .filter(x => x.time <= toSeconds(min))
            .map(ward => {
              return { time: ward.time, xRatio: this.wardRatio(ward.x), yRatio: this.wardRatio(ward.y) };
            }),
          sents_coord: player.sen_log
            .filter(x => x.time <= toSeconds(min))
            .map(ward => {
              return { time: ward.time, xRatio: this.wardRatio(ward.x), yRatio: this.wardRatio(ward.y) };
            }),
          buybacks: player.buyback_log.map(x => x.time <= toSeconds(min)).length
        } as LevelTwoPlayerStamps;

        playerStamps[i][min].diff = {} as LevelTwoPlayerMapping;
        playerStamps[i][min].diff.sum = {
          networth: this.diff_t(player.gold_t, min, prev_min),
          xp: this.diff_t(player.xp_t, min, prev_min),
          level: this.toLevel(this.diff_t(player.xp_t, min, prev_min)),
          kills: player.kills_log.filter(x => x.time > toSeconds(prev_min) && x.time <= toSeconds(min)).length,
          lh: this.diff_t(player.lh_t, min, prev_min),
          denies: this.diff_t(player.dn_t, min, prev_min),
          obs: player.obs_log.filter(x => x.time > toSeconds(prev_min) && x.time <= toSeconds(min)).length,
          sents: player.sen_log.filter(x => x.time > toSeconds(prev_min) && x.time <= toSeconds(min)).length,
          obs_coord: player.obs_log
            .filter(x => x.time > toSeconds(prev_min) && x.time <= toSeconds(min))
            .map(ward => {
              return { time: ward.time, xRatio: this.wardRatio(ward.x), yRatio: this.wardRatio(ward.y) };
            }),
          sents_coord: player.sen_log
            .filter(x => x.time > toSeconds(prev_min) && x.time <= toSeconds(min))
            .map(ward => {
              return { time: ward.time, xRatio: this.wardRatio(ward.x), yRatio: this.wardRatio(ward.y) };
            }),
          buybacks: player.buyback_log.map(x => x.time > toSeconds(prev_min) && x.time <= toSeconds(min)).length
        } as LevelTwoPlayerStamps;

        playerStamps[i][min].teamfights.simple = {} as LevelTwoPlayerTeamfightMapping;
        playerStamps[i][min].teamfights.simple.sum = {
          networth: _teamfights.simple.map(x => x.players[i].gold_delta).reduce(reducer),
          xp: _teamfights.simple.map(x => x.players[i].xp_delta).reduce(reducer),
          damage: _teamfights.simple.map(x => x.players[i].damage).reduce(reducer),
          healing: _teamfights.simple.map(x => x.players[i].healing).reduce(reducer),
          buybacks: _teamfights.simple.map(x => x.players[i].buybacks).reduce(reducer),
          deaths: _teamfights.simple.map(x => x.players[i].deaths).reduce(reducer),
          ability_uses: _teamfights.simple
            .map(x => x.players[i].ability_uses)
            .reduce((a, b) => {
              const union = new Set([...Object.keys(a), ...Object.keys(b)]);
              const ability_mapping = {};
              for (const abilityName of union.values()) {
                ability_mapping[abilityName] = undefinedToZero(a[abilityName]) + undefinedToZero(b[abilityName]);
              }
              return ability_mapping;
            }),
          item_uses: _teamfights.simple
            .map(x => x.players[i].item_uses)
            .reduce((a, b) => {
              const union = new Set([...Object.keys(a), ...Object.keys(b)]);
              const item_mapping = {};
              for (const itemName of union.values()) {
                item_mapping[itemName] = undefinedToZero(a[itemName]) + undefinedToZero(b[itemName]);
              }
              return item_mapping;
            }),
          killed: _teamfights.simple.map(x => Object.keys(x.players[i].killed).length).reduce(reducer)
        };
        playerStamps[i][min].teamfights.diff = {} as LevelTwoPlayerTeamfightMapping;
        playerStamps[i][min].teamfights.diff.sum = {
          networth: _teamfights.diff.map(x => x.players[i].gold_delta).reduce(reducer),
          xp: _teamfights.diff.map(x => x.players[i].xp_delta).reduce(reducer),
          damage: _teamfights.diff.map(x => x.players[i].damage).reduce(reducer),
          healing: _teamfights.diff.map(x => x.players[i].healing).reduce(reducer),
          buybacks: _teamfights.diff.map(x => x.players[i].buybacks).reduce(reducer),
          deaths: _teamfights.diff.map(x => x.players[i].deaths).reduce(reducer),
          ability_uses: _teamfights.diff
            .map(x => x.players[i].ability_uses)
            .reduce((a, b) => {
              const union = new Set([...Object.keys(a), ...Object.keys(b)]);
              const ability_mapping = {};
              for (const abilityName of union.values()) {
                ability_mapping[abilityName] = undefinedToZero(a[abilityName]) + undefinedToZero(b[abilityName]);
              }
              return ability_mapping;
            }),
          item_uses: _teamfights.diff
            .map(x => x.players[i].item_uses)
            .reduce((a, b) => {
              const union = new Set([...Object.keys(a), ...Object.keys(b)]);
              const item_mapping = {};
              for (const itemName of union.values()) {
                item_mapping[itemName] = undefinedToZero(a[itemName]) + undefinedToZero(b[itemName]);
              }
              return item_mapping;
            }),
          killed: _teamfights.diff.map(x => Object.keys(x.players[i].killed).length).reduce(reducer)
        };
      }
      /**
       * aggregate player data by current minute key
       * loop thru each aggregation type
       * */
      const sumTypes = ["ratio", "core_ratio", "support_ratio"] as SumTypes[];
      for (const ratio of sumTypes) {
        let playerStamps_map: MinuteSnapShot[];
        /** apply a filter for each ratio type */
        if (ratio == "ratio") {
          playerStamps_map = playerStamps.map(x => x[min]);
        } else if (ratio == "core_ratio") {
          playerStamps_map = playerStamps.filter((x, i) => data.players[i].calculatedRole >= 3).map(x => x[min]);
        } else if (ratio == "support_ratio") {
          playerStamps_map = playerStamps.filter((x, i) => data.players[i].calculatedRole <= 4).map(x => x[min]);
        }
        /** reducing creates a single object with all workable fields summed */
        const playerStamps_reduced = playerStamps_map.reduce(this.sumTypeReducer);
        /** create the ratio data for each player now */
        for (const player of playerStamps) {
          /**
           * 1 do the simple & diff leveltwo player mappings
           * 2 do the simple & diff leveltwo player teamfight mappings
           * */
          for (const snapType of ["simple", "diff"] as ("simple" | "diff")[]) {
            player[min][snapType][ratio] = {
              networth: player[min][snapType][ratio].networth / playerStamps_reduced[snapType][ratio].networth,
              xp: player[min][snapType][ratio].xp / playerStamps_reduced[snapType][ratio].xp,
              level: player[min][snapType][ratio].level / playerStamps_reduced[snapType][ratio].level,
              kills: player[min][snapType][ratio].kills / playerStamps_reduced[snapType][ratio].kills,
              lh: player[min][snapType][ratio].lh / playerStamps_reduced[snapType][ratio].lh,
              denies: player[min][snapType][ratio].denies / playerStamps_reduced[snapType][ratio].denies,
              obs: player[min][snapType][ratio].obs / playerStamps_reduced[snapType][ratio].obs,
              sents: player[min][snapType][ratio].sents / playerStamps_reduced[snapType][ratio].sents,
              buybacks: player[min][snapType][ratio].buybacks / playerStamps_reduced[snapType][ratio].buybacks
            };
            player[min].teamfights[snapType][ratio] = {
              networth:
                player[min].teamfights[snapType][ratio].networth /
                playerStamps_reduced.teamfights[snapType][ratio].networth,
              xp: player[min].teamfights[snapType][ratio].xp / playerStamps_reduced.teamfights[snapType][ratio].xp,
              damage:
                player[min].teamfights[snapType][ratio].damage /
                playerStamps_reduced.teamfights[snapType][ratio].damage,
              healing:
                player[min].teamfights[snapType][ratio].healing /
                playerStamps_reduced.teamfights[snapType][ratio].healing,
              deaths:
                player[min].teamfights[snapType][ratio].deaths /
                playerStamps_reduced.teamfights[snapType][ratio].deaths,
              buybacks:
                player[min].teamfights[snapType][ratio].buybacks /
                playerStamps_reduced.teamfights[snapType][ratio].buybacks,
              killed:
                player[min].teamfights[snapType][ratio].killed / playerStamps_reduced.teamfights[snapType][ratio].killed
            };
          }
        }
      }

      /** aggregate team data by current minute key */
      for (const isRadiant of [true, false]) {
        const radiantMod = isRadiant ? 1 : -1;
        const team_adv = {
          gold: data.radiant_gold_adv[min] * radiantMod,
          xp: data.radiant_xp_adv[min] * radiantMod,
          roleLevel1: this.toLevel(data.players.find(x => x.calculatedRole == 1 && x.isRadiant == isRadiant).xp_t[min]),
          roleLevel2: this.toLevel(data.players.find(x => x.calculatedRole == 2 && x.isRadiant == isRadiant).xp_t[min]),
          roleLevel3: this.toLevel(data.players.find(x => x.calculatedRole == 3 && x.isRadiant == isRadiant).xp_t[min]),
          roleLevel4: this.toLevel(data.players.find(x => x.calculatedRole == 4 && x.isRadiant == isRadiant).xp_t[min]),
          roleLevel5: this.toLevel(data.players.find(x => x.calculatedRole == 5 && x.isRadiant == isRadiant).xp_t[min]),
          rolenetWorth1: data.players.find(x => x.calculatedRole == 1 && x.isRadiant == isRadiant).gold_t[min],
          rolenetWorth2: data.players.find(x => x.calculatedRole == 2 && x.isRadiant == isRadiant).gold_t[min],
          rolenetWorth3: data.players.find(x => x.calculatedRole == 3 && x.isRadiant == isRadiant).gold_t[min],
          rolenetWorth4: data.players.find(x => x.calculatedRole == 4 && x.isRadiant == isRadiant).gold_t[min],
          rolenetWorth5: data.players.find(x => x.calculatedRole == 5 && x.isRadiant == isRadiant).gold_t[min]
        };
        /** add the built table to the correct players */
        if (isRadiant) {
          for (const slot of [0, 1, 2, 3, 4]) {
            playerStamps[slot][min].team_adv = team_adv;
          }
        } else {
          for (const slot of [5, 6, 7, 8, 9]) {
            playerStamps[slot][min].team_adv = team_adv;
          }
        }
      }
    }

    return playerStamps;
  }

  sumTypeReducer(a: MinuteSnapShot, b: MinuteSnapShot) {
    a.simple.sum.networth += b.simple.sum.networth;
    a.simple.sum.xp += b.simple.sum.level;
    a.simple.sum.kills += b.simple.sum.kills;
    a.simple.sum.lh += b.simple.sum.lh;
    a.simple.sum.denies += b.simple.sum.denies;
    a.simple.sum.obs += b.simple.sum.obs;
    a.simple.sum.sents += b.simple.sum.sents;
    a.simple.sum.buybacks += b.simple.sum.buybacks;

    a.diff.sum.networth += b.diff.sum.networth;
    a.diff.sum.xp += b.diff.sum.level;
    a.diff.sum.kills += b.diff.sum.kills;
    a.diff.sum.lh += b.diff.sum.lh;
    a.diff.sum.denies += b.diff.sum.denies;
    a.diff.sum.obs += b.diff.sum.obs;
    a.diff.sum.sents += b.diff.sum.sents;
    a.diff.sum.buybacks += b.diff.sum.buybacks;

    a.teamfights.simple.sum.networth += b.teamfights.simple.sum.networth;
    a.teamfights.simple.sum.xp += b.teamfights.simple.sum.xp;
    a.teamfights.simple.sum.damage += b.teamfights.simple.sum.damage;
    a.teamfights.simple.sum.healing += b.teamfights.simple.sum.healing;
    a.teamfights.simple.sum.buybacks += b.teamfights.simple.sum.buybacks;
    a.teamfights.simple.sum.deaths += b.teamfights.simple.sum.deaths;
    a.teamfights.simple.sum.killed += b.teamfights.simple.sum.killed;

    a.teamfights.diff.sum.networth += b.teamfights.diff.sum.networth;
    a.teamfights.diff.sum.xp += b.teamfights.diff.sum.xp;
    a.teamfights.diff.sum.damage += b.teamfights.diff.sum.damage;
    a.teamfights.diff.sum.healing += b.teamfights.diff.sum.healing;
    a.teamfights.diff.sum.buybacks += b.teamfights.diff.sum.buybacks;
    a.teamfights.diff.sum.deaths += b.teamfights.diff.sum.deaths;
    a.teamfights.diff.sum.killed += b.teamfights.diff.sum.killed;

    return a;
  }

  diff_t(t_array: number[], min: number, prev_min: number): number {
    return t_array[min] - t_array[prev_min];
  }
  /**
   * previous index item to get the minute index
   * @param minuteStamps array of minute index values
   * @param min minute value to compare with array
   * @returns
   */
  private prev_min(minuteStamps: number[], min: number) {
    const min_i = minuteStamps.findIndex(x => x == min);
    return min_i == 0 ? 0 : minuteStamps[min_i - 1];
  }

  private next_min(player: Player, min: number) {
    const min_i = player.times.findIndex(x => x == min);
    return min_i == player.times.length - 1 ? min_i : min_i + 1;
  }

  wardRatio(x: number): number {
    return Number((x / 190).toFixed(2));
  }
  toLevel(totalxp: number): number {
    const xpTable = [
      0, 230, 600, 1080, 1660, 2260, 2980, 3730, 4620, 5550, 6520, 7530, 8580, 9805, 11055, 12330, 13630, 14955, 16455,
      18045, 19645, 21495, 23595, 25945, 28545, 32045, 36545, 42045, 48545, 56045
    ];
    if (totalxp >= xpTable[xpTable.length - 1]) return 30;
    return xpTable.findIndex(x => x >= totalxp);
  }

  private buildings(data: PreCalData) {
    const buildings_arr = data.objectives.filter(x => x.type == "building_kill");
    const buildings_mapping = {};
    for (const b of buildings_arr) {
      const building_obj = this.buildingParse(b);
      let creep: boolean, hero_obj: PreCalPlayer, deny: boolean, hero: number, role: Role;
      if (!b.player_slot) {
        creep = true;
        deny = false;
      } else {
        creep = false;
        hero_obj = data.players.find(x => x.player_slot == b.player_slot);
        hero = hero_obj.hero_id;
        role = hero_obj.calculatedRole as Role;
        deny =
          (building_obj.team == "radiant" && hero_obj.player_slot <= 4) ||
          (building_obj.team == "dire" && hero_obj.player_slot >= 5)
            ? true
            : false;
      }
      buildings_mapping[building_obj.name] = {
        team: building_obj.team,
        lane: building_obj.lane,
        depth: building_obj.depth,
        creep,
        deny,
        role,
        hero,
        time: b.time
      };
    }
    return buildings_mapping;
  }

  private buildingParse(building: Objective) {
    const building_name = building.key as string;
    const team: Faction = building_name.includes("goodguys") ? "radiant" : "dire";
    let lane;
    if (building_name.includes("top")) lane = "top";
    if (building_name.includes("bot")) lane = "mid";
    if (building_name.includes("bot")) lane = "bot";
    if (!lane) lane = "fort";
    let depth;
    if (building_name.includes("tower1")) depth = 1;
    if (building_name.includes("tower2")) depth = 2;
    if (building_name.includes("tower3")) depth = 3;
    if (building_name.includes("tower4")) depth = 4;

    return {
      name: `${team}-${lane}-${depth}`,
      team,
      lane,
      depth
    };
  }

  private convertToPlayerSlot(slot: number) {
    const mapping = {
      5: 128,
      6: 129,
      7: 130,
      8: 131,
      9: 132
    };
    return mapping[slot];
  }

  private firstblood(data: PreCalData): FirstbloodObj {
    const fb = data.objectives.find(x => x.type == "CHAT_MESSAGE_FIRSTBLOOD");
    const fb_killer = data.players.find(x => x.player_slot == fb.player_slot);
    const fb_died = data.players.find(x => x.player_slot == this.convertToPlayerSlot(fb.key as number));
    return {
      time: fb.time,
      heroLasthit: fb_killer.hero_id,
      heroDied: fb_died.hero_id,
      roleLasthit: fb_killer.calculatedRole as Role,
      roleDied: fb_died.calculatedRole as Role
    };
  }

  private teamComp(match: OpenDotaMatch, team: "radiant" | "dire") {
    return match.players
      .filter(player => {
        if (team == "radiant") return player.player_slot <= 4;
        else return player.player_slot > 4;
      })
      .map(player => player.hero_id);
  }
}
const toSeconds = (min: number) => {
  return min * 60;
};
const toWholeMinutes = (seconds: number) => {
  return Math.floor(seconds / 60);
};
const toFloatMinutes = (seconds: number) => {
  return Number((seconds / 60).toFixed(1));
};
const reducer = (previousValue: number, currentValue: number) => previousValue + currentValue;

const undefinedToZero = (arg0: number) => {
  return arg0 || 0;
};
