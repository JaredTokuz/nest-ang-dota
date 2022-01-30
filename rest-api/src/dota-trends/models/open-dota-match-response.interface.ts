export interface OpenDotaMatchResponse {
  match_id: number;
  /** used to get region info */
  cluster: number;
  radiant_win: boolean;
  /** in seconds */
  duration: number;
  radiant_gold_adv: number[];
  radiant_xp_adv: number[];
  /** get the bans in order not sure */
  draft_timings: any[];
  /** the banning order seems to be off */
  picks_bans: any[];
  teamfights: Teamfights[];
  players: Player[];
  /** patch id */
  patch: number;
  [key: string]: unknown;
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
  killed: any;
  deaths: number;
  buybacks: number;
  damage: number;
  healing: number;
  gold_delta: number;
  xp_delta: number;
  xp_start: number;
  [key: string]: unknown;
}

export interface Player {
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
  };
  /** last hits 1 minute array */
  lh_t: number[];
  /** idk find out */
  life_state: { [id: string]: number };
  /** obs wards deaths */
  obs_left_log: any[];
  /** obs placed */
  obs_log: any[];
  party_id: number;
  party_size: number;
  permanent_buffs: any[];
  purchase_log: {
    time: number;
    key: string;
    charges?: number;
  }[];
  runes_log: {
    time: number;
    key: string;
  };
  /** sentry obs wards deaths */
  sen_left_log: any[];
  /** sentry obs placed */
  sen_log: any[];
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
  lane: number;
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
  [key: string]: unknown;
}
