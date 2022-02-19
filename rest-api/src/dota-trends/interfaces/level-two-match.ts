import { ObjectiveType, PurchaseLogs } from './open-dota-match';

export interface LevelTwoHero {
  /** uuid 1 */
  match_id: number;
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

export type Faction = 'radiant' | 'dire';

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

interface Item {
  time: number /** seconds */;
  name: string /** key id name */;
  type?: string /** eventually it will be a category */;
  inMinutesf: number /** float 1 decimal */;
  networth: number /** at time of purchase **the minute after index */;
  level: number /** the level */;
  cost?: number /** the cost of item */;
  completedCost?: number /** the cost of the fully completed item if the case */;
}

type KilledRoles = {
  inMinutesf: number /** 1.1f */;
  npcName: string;
  /** TODO inject the heroid from the npcname constant services and get all these */
  //   level: number;
  //   enemyRole: number;
  //   hero: number;
};

export interface LevelTwoObjective {
  //   time: number;
  inMinutesf: number /** 1.1f */;
  //   target: Target /** target type */;

  /** these two same as Objective */
  type: ObjectiveType;
  key?: number | string;
  gold?: number;
}
export type LevelTwoObjectives = LevelTwoObjective[];

export type Target =
  | 'lastHitFirstblood'
  | 'diedFirstblood'
  | 'tower'
  | 'denyTower'
  | 'lastHitroshan'
  | 'roshanAegis'
  | 'lastHitCourier';

interface CalculatedFields {
  team: Faction;
  role: Role;
  win: boolean;

  /** 0-9 */
  pick_order: number;

  firstblood: FirstbloodObj;

  /** in general in the game duplicated */
  buildings: {
    /** team and lane and depth */
    [name: string]: {
      team: Faction;
      lane: 'safe' | 'mid' | 'off' | 'fort';
      depth: number;
      deny: boolean;
      creep: boolean;
      role?: Role;
      hero?: number;
      time: number;
    };
  };

  starting_items: {
    start: PurchaseLogs;
    first30: PurchaseLogs;
  };

  stamps: Stamps;

  objectives: LevelTwoObjectives;
  killed_roles: KilledRoles[];
  items: Item[];
  skillbuild: SkillBuild[];
}

export type Stamps = { [minute in MinuteKeys]: MinuteSnapShot };

export type MinuteKeys = number; /**1, 2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24; */

export type TeamFightStruct = {
  simple: LevelTwoPlayerTeamfightMapping;
  diff: LevelTwoPlayerTeamfightMapping;
};

export interface MinuteSnapShot {
  simple: LevelTwoPlayerMapping;
  diff: LevelTwoPlayerMapping;

  /**
   * this data is aggregated by team so it is duplicate 5x each
   * someday score death duration and gold gain (also their loss with a died_to_role class) */
  team_adv: {
    gold: number;
    xp: number;
    roleLevel1: number;
    roleLevel2: number;
    roleLevel3: number;
    roleLevel4: number;
    roleLevel5: number;
    rolenetWorth1: number;
    rolenetWorth2: number;
    rolenetWorth3: number;
    rolenetWorth4: number;
    rolenetWorth5: number;
    /** todo item score someday */
  };
  teamfights: TeamFightStruct;
}

export type LevelTwoPlayerMapping = {
  [sum in SumTypes]: LevelTwoPlayerStamps;
};

export type SumTypes = 'sum' | 'ratio' | 'core_ratio' | 'support_ratio';

/** cumulative sums */
export interface LevelTwoPlayerStamps {
  networth: number;
  xp: number;
  /** level as a float */
  level: number;
  kills: number;
  lh: number;
  denies: number;
  obs: number;
  sents: number;
  obs_coord?: WardCoord[];
  sents_coord?: WardCoord[];
  /** todo on the q mark someday */
  //   obs_killed?: number;
  //   dewarded_obs?: number;
  buybacks: number;
}

interface WardCoord {
  time: number;
  /** "x" or "y" / 190 */
  xRatio: number;
  yRatio: number;
}

export type LevelTwoPlayerTeamfightMapping = {
  [sum in SumTypes]: LevelTwoPlayerTeamfightStamps;
};

export interface LevelTwoPlayerTeamfightStamps {
  networth: number;
  xp: number;
  damage: number;
  healing: number;
  buybacks: number;
  deaths: number;
  /** sum per key */
  ability_uses?: { [name: string]: number };
  item_uses?: { [name: string]: number };
  killed: number /** TODO someday better */;
}

export interface SkillBuild {
  //   time: number;
  minutes: number /** whole minutes because the matching is indirect */;
  level: number /** the level */;
  networth: number;
  /** add this one with constant service ability injector */
  skill?: string;
  /** delete this one eventuall */
  skillId?: number;
  //   first: number /** 1-4 */;
  //   second: number /** 1-4 */;
  //   third: number /** 1-4 */;
  //   ultimate: number /** 1-3 */;
  //   attributes: number /** 1-7 */;
  //   talent10: "right" | "left";
  //   talent15: "right" | "left";
  //   talent20: "right" | "left";
  //   talent25: "right" | "left";

  //   talent25id: string;
  //   talent10id: string;
  //   talent15id: string;
  //   talent20id: string;
}
