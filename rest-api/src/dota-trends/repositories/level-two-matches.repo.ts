import { ContextObject } from "../models/context-object.interface";
import { MatchesRepo, MatchPass } from "./matches.repo";
import { OpenDotaMatch } from "../models/open-dota-match.interface";
import { MATCHES } from "../constants";
import { Inject, Injectable } from "@nestjs/common";
import { BehaviorSubject, concatAll, concatMap, delay, from, map, Observable, of, tap } from "rxjs";
import { Collection } from "mongodb";

@Injectable()
export class LevelTwoMatchesRepo {
  private subject = new BehaviorSubject<OpenDotaMatch>(null);
  levelTwomatch$: Observable<OpenDotaMatch> = this.subject.asObservable();

  constructor(
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
      this.matchCollection
        .updateOne(
          { match_id: data.match_id },
          {
            $currentDate: { calculatedsyncDate: true },
            $set: { levelTwo: calculatedFields }
          }
        )
        .finally(() => {
          ctx.logger.log("info", "mongo update match with calculated");
        })
    );
  }

  teamComp(match: OpenDotaMatch, team: "radiant" | "dire") {
    return match.players
      .filter(player => {
        if (team == "radiant") return player.player_slot <= 4;
        else return player.player_slot > 4;
      })
      .map(player => player.hero_id);
  }
}
