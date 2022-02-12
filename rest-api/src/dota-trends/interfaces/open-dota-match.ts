export interface OpenDotaMatch {
  match_id: number;
  /** used to get region info */
  cluster: number;
  radiant_win: boolean;
  /** in seconds */
  duration: number;
  radiant_gold_adv: number[];
  radiant_xp_adv: number[];
  /** get the bans in order not sure */
  draft_timings: DraftTimings;
  objectives: Objectives;
  /** the banning order seems to be off */
  picks_bans: PicksBans;
  teamfights: Teamfights[];
  players: Player[];
  /** patch id */
  patch: number;
  [key: string]: unknown;
}

export type DraftTimings = DraftTiming[];

export interface DraftTiming {
  /** ordering already sorted */
  order: number;
  /** false == ban */
  pick: boolean;
  /** 0 or 2 idk what it means */
  active_team: number;
  hero_id: number;
  /** idk useless */
  player_slot: any;
  /** idk useless */
  extra_time: number;
  /** idk useless */
  total_time_taken: number;
}

export type Objectives = Objective[];

export interface Objective {
  /** seconds */
  time: number;
  /** category */
  type: ObjectiveType;
  /** player slot winner but doesnt match right for dire 0-9 */
  slot?: number;
  /** usually id of the target but it is 0-9 for fb but building a string of building name*/
  key?: number | string;
  /** matches the real player_slot */
  player_slot?: number;
  /** similar to slot but unit is missing so you need to convert the dire mistake use >= 5 */
  team?: number;
  /** string name of hero or creeps */
  unit?: string;
}

export type ObjectiveType =
  | "CHAT_MESSAGE_FIRSTBLOOD"
  | "CHAT_MESSAGE_COURIER_LOST"
  | "building_kill"
  | "CHAT_MESSAGE_ROSHAN_KILL"
  | "CHAT_MESSAGE_AEGIS";

export type PicksBans = PicksBan[];

export interface PicksBan {
  /** true=picked false=banned */
  is_pick: boolean;
  /** hero */
  hero_id: number;
  /** 0=radiant 1=dire */
  team: number;
  /** sequence order 0-9 bans shown are all the player voted bans (not all bans go thru)  */
  order: number;
}

export interface Teamfights {
  start: number;
  end: number;
  players: TeamfightsPlayers[];
  [key: string]: unknown;
}

export interface TeamfightsPlayers {
  ability_uses: { [key: string]: number };
  item_uses: { [key: string]: number };
  killed: { [npc_hero: string]: 1 };
  deaths: number;
  buybacks: number;
  damage: number;
  healing: number;
  gold_delta: number;
  xp_delta: number;
  xp_start: number;
  [key: string]: unknown;
}

export type PurchaseLogs = {
  time: number;
  key: string;
  charges?: number;
}[];

export interface Player {
  /** 0-4 & 128-132 */
  player_slot: number;
  ability_targets: { [ability: string]: { [enemy_hero: string]: number } };
  /** ability ids in order */
  ability_upgrades_arr: number[];
  /** sometimes the numbers are bugged */
  ability_uses: { [abilities: string]: number };
  account_id: number;
  /** id fields of buttons actions; constant for it */
  actions: { [action_id: string]: number };
  assists: number;
  buyback_log: any[];
  camps_stacked: number;
  connection_log: any[];
  creeps_stacked: number;
  damage: { [enemy: string]: number };
  damage_inflictor: { [ability: string]: number };
  damage_inflictor_received: { [ability: string]: number };
  damage_taken: { [enemy: string]: number };
  damage_targets: { [ability: string]: { [enemy_hero: string]: number } };
  deaths: number;
  /** deny 1 minute array */
  dn_t: number[];
  firstblood_claimed: number;
  gold_per_min: number;
  /** id for each gold category; constant for it */
  gold_reasons: { [id: string]: number };
  gold_spent: number;
  /** 1 minute array */
  gold_t: number[];
  hero_damage: number;
  hero_healing: number;
  /** sometimes bugged */
  hero_hits: { [ability: string]: number };
  hero_id: number;
  item_uses: { [item: string]: number };
  kill_streaks: { [streak_number: string]: number };
  killed: { [enemy: string]: number };
  killed_by: { [hero: string]: number };
  kills: number;
  kills_log: {
    time: number;
    /** the hero name */
    key: string;
  }[];
  /** last hits 1 minute array */
  lh_t: number[];
  /** idk find out */
  life_state: { [id: string]: number };
  /** obs wards deaths */
  obs_left_log: any[];
  /** obs placed x&y=0-190 */
  obs_log: {
    time: number;
    x: number;
    y: number;
    player_slot: number;
  }[];
  party_id: number;
  party_size: number;
  permanent_buffs: any[];
  purchase_log: PurchaseLogs;
  runes_log: {
    time: number;
    key: string;
  };
  /** sentry obs wards deaths */
  sen_left_log: any[];
  /** sentry obs placed */
  sen_log: {
    time: number;
    x: number;
    y: number;
    player_slot: number;
  }[];
  stuns: number;
  /** percentage number */
  teamfight_participation: number;
  tower_damage: number;
  towers_killed: number;
  xp_per_min: number;
  /** constant for it */
  xp_reasons: { [id: string]: number };
  xp_t: number[];
  courier_kills: number;
  kills_per_min: number;
  neutral_kills: number;
  lane_kills: number;
  hero_kills: number;
  ancient_kills: number;
  tower_kills: number;
  roshan_kills: number;
  /** 1=bot 2=mid 3=top */
  lane: number;
  /** 1=safe 2=mid 3=off */
  lane_role: number;
  observer_kills: number;
  sentry_kills: number;
  is_roaming: boolean;
  item_usage: { [item: string]: number };
  life_state_dead: number;
  actions_per_min: number;
  /** percent number */
  lane_efficiency: number;
  benchmarks: {
    [benchmark: string]: {
      raw: number;
      pct: number;
    };
  };
  /** example : 0,60,120,180,240 */
  times: number[];
  [key: string]: unknown;
  isRadiant: boolean;
  win: boolean;
  lose: boolean;
}
