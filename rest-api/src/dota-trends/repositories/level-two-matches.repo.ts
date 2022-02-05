import { Faction } from "./../models/level-two-match.interface";
import { Player } from "./../../../dist/src/dota-trends/models/open-dota-match-response.interface.d";
import { ContextObject } from "../models/context-object.interface";
import { MatchesRepo, MatchPass } from "./matches.repo";
import { Objective, OpenDotaMatch } from "../models/open-dota-match.interface";
import { LVL_TWO_HEROES, MATCHES } from "../constants";
import { Inject, Injectable } from "@nestjs/common";
import { BehaviorSubject, concatAll, concatMap, delay, from, map, Observable, of, tap } from "rxjs";
import { Collection } from "mongodb";
import { FirstbloodObj, LevelTwoHero, Role } from "../models/level-two-match.interface";

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
    const { data, ...ctx } = val;
    ctx.logger.log("info", "calculate matches");
    const calculatedFields = {
      radiant_team: this.teamComp(data, "radiant"),
      dire_team: this.teamComp(data, "dire")
    };
    ctx.logger.log("info", "calculate complete");

    return from(
      this.levelTwoMatchCollection.bulkWrite(
        data.players.map(player => {
          return {
            updateOne: {
              filter: { match_id: data.match_id, hero_id: player.hero_id },
              update: {
                $set: {
                  syncDate: new Date(),
                  voted_bans: data.draft_timings.map(x => x.hero_id),
                  teamfight_participation: player.teamfight_participation,
                  lane_efficiency: player.lane_efficiency,
                  benchmarks: player.benchmarks,
                  is_roaming: player.is_roaming,
                  calculated: {
                    team: player.isRadiant ? "radiant" : "dire",
                    role: player.lane_role as Role,
                    win: player.win ? true : false,
                    pick_order: data.picks_bans.find(x => x.hero_id == player.hero_id).order,
                    firstblood: this.firstblood(data),
                    buildings: this.buildings(data),
                    /** check purchase_log first, then item_usage */
                    starting_items: {
                      start: player.purchase_log.,
                      first30: {}
                    }
                    // stamps: {}
                  }
                },
                $setOnInsert: {
                  match_id: data.match_id,
                  hero_id: player.hero_id,
                  patch: data.patch,
                  cluster: data.cluster,
                  duration: data.duration
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
  private buildings(data: OpenDotaMatch) {
    const buildings_arr = data.objectives.filter(x => x.type == "building_kill");
    const buildings_mapping = {};
    for (const b of buildings_arr) {
      const building_obj = this.buildingParse(b);
      let creep: boolean, hero_obj: Player, deny: boolean, hero: number, role: Role;
      if (!b.player_slot) {
        creep = true;
        deny = false;
      } else {
        creep = false;
        hero_obj = data.players.find(x => x.player_slot == b.player_slot);
        hero = hero_obj.hero_id;
        role = hero_obj.lane_role as Role;
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

  private firstblood(data: OpenDotaMatch): FirstbloodObj {
    const fb = data.objectives.find(x => x.type == "CHAT_MESSAGE_FIRSTBLOOD");
    const fb_killer = data.players.find(x => x.player_slot == fb.player_slot);
    const fb_died = data.players.find(x => x.player_slot == this.convertToPlayerSlot(fb.key));
    return {
      time: fb.time,
      heroLasthit: fb_killer.hero_id,
      heroDied: fb_died.hero_id,
      roleLasthit: fb_killer.lane_role as Role,
      roleDied: fb_died.lane_role as Role
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
