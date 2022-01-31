// export interface LevelTwoMatchData {
//   /** uuid */
//   match_id: number;
//   /** patch id */
//   patch: number;
//   /** used to get region info */
//   cluster: number;
//   /** in seconds */
//   duration: number;
//   /** get the bans in order not sure */
//   draft_timings: any[];
//   /** the banning order seems to be off */
//   picks_bans: any[];
//   heroes: { [id: number]: LevelTwoHeroes };
// }

export interface LevelTwoHeroes {
  /** uuid */
  match_id: number;
  /** patch id */
  patch: number;
  /** used to get region info */
  cluster: number;
  /** in seconds */
  duration: number;
  /** get the bans in order not sure */
  draft_timings: any[];
  /** the banning order seems to be off */
  picks_bans: any[];

  calculated: CalculatedFields;
}

interface CalculatedFields {
  team: "radiant" | "dire";
  role: 1 | 2 | 3 | 4 | 5;
  win: boolean;
  hero_id: number;
  firstblood_claimed: number;
  is_roaming: boolean;
  stamps: {
    [minute in MinuteKeys]: {
      simple: {
        [sum in SumTypes]: LevelTwoPlayerStamps;
      };
      diff: {
        [sum in SumTypes]: LevelTwoPlayerStamps;
      };

      team_adv: {
        gold: number;
        xp: number;
      };
      teamfights: {
        simple: {
          [sum in SumTypes]: LevelTwoPlayerTeamfightStamps;
        };
        diff: {
          [sum in SumTypes]: LevelTwoPlayerTeamfightStamps;
        };
      };
      items: { [name: string]: number };
      skillbuild: SkillBuild;
    };
  };
}
type MinuteKeys = 2 | 4 | 6 | 8 | 10 | 15 | 20;
type SumTypes = "sum" | "ratio" | "core_ratio" | "support_ratio";

/** cumulative sums */
interface LevelTwoPlayerStamps {
  networth: number;
  xp: number;
  /** level as a float */
  level: number;
  kills: number;
  lh: number;
  denies: number;
  obs: number;
  sents: number;
  obs_killed: number;
  dewarded_obs: number;
  buybacks: number;
}

interface LevelTwoPlayerTeamfightStamps {
  gold: number;
  xp: number;
  damage: number;
  healing: number;
  buybacks: number;
  deaths: number;
  ability_uses: any;
  item_uses: any;
  killed: any;
}

interface SkillBuild {
  first: 1 | 2 | 3 | 4;
  second: 1 | 2 | 3 | 4;
  third: 1 | 2 | 3 | 4;
  ultimate: 1 | 2 | 3 | 4;
  attributes: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  talent10: "right" | "left" | "both";
  talent15: "right" | "left" | "both";
  talent20: "right" | "left" | "both";
  talent25: "right" | "left" | "both";
}
