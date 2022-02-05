export interface LevelTwoHero {
  /** uuid 1 */
  match_id;
  /** uuid 2 */
  hero_id: number;
  /** patch id */
  patch: number;
  /** used to get region info */
  cluster: number;
  /** in seconds */
  duration: number;

  syncDate: Date;

  /** get the bans in order not sure useless just voted bans */
  //   draft_timings: any[];
  /** the banning order is off; they are just voted bans */
  //   picks_bans: PicksBans;

  /** voted bans hero_id[] */
  voted_bans: number[];

  /** built in the call no changes */
  teamfight_participation: number;
  lane_efficiency: number;
  benchmarks: any;
  is_roaming: boolean;

  calculated: CalculatedFields;
}

export type Role = 1 | 2 | 3 | 4 | 5;

export type Faction = "radiant" | "dire";

export type FirstbloodObj = {
  time: number;
  /** role that got the last hit */
  roleLasthit: Role;
  /** role that got killed */
  roleDied: Role;
  /** got the last hit :) */
  lasthit?: boolean;
  /** gave first blood :( */
  died?: boolean;
  /** hero_id */
  heroLasthit: number;
  heroDied: number;
};

interface CalculatedFields {
  team: Faction;
  role: Role;
  win: boolean;

  /** 0-9 */
  pick_order: number;

  firstblood: FirstbloodObj;

  buildings: {
    /** team and lane and depth */
    [name: string]: {
      team: Faction;
      lane: "safe" | "mid" | "off" | "fort";
      depth: number;
      deny: boolean;
      creep: boolean;
      role?: Role;
      hero?: number;
      time: number;
    };
  };

  starting_items?: {
    start: { [name: string]: number };
    first30: { [name: string]: number };
  };

  stamps?: {
    [minute in MinuteKeys]: {
      simple: {
        [sum in SumTypes]: LevelTwoPlayerStamps;
      };
      diff: {
        [sum in SumTypes]: LevelTwoPlayerStamps;
      };

      /** TODO */

      objectives: {
        lhFirstblood?: boolean;
        diedFirstblood?: boolean;
        enemyTowers: number;
        allyTowers: number;
        roshanKill: number;
        roshanAegis: number;
        enemyCouriers: number;
        allyCouriers: number;
      };

      killed_roles?: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
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
  first: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  second: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  third: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  ultimate: 1 | 2 | 3 | 4;
  attributes: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  talent10: "right" | "left" | "both";
  talent15: "right" | "left" | "both";
  talent20: "right" | "left" | "both";
  talent25: "right" | "left" | "both";
}
