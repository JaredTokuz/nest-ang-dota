import { WithId } from "mongodb";
export type OpenDotaLiveResponse = OpenDotaLiveGame[];

export interface LiveGame {
  /** unique id for a match (game) */
  match_id: string;
  /** unix time stamp in seconds */
  activate_time: number;
}

export interface OpenDotaLiveGame extends LiveGame {
  /** average mmr of players (estimated?) */
  average_mmr: number;

  /** there are other fields not being used */
  [key: string]: unknown;
}

export interface LiveGameDocument extends WithId<LiveGame> {
  /** set to null at first, then set to true after the game is parsed
   * and added to the matches collection */
  game_finished: null | boolean;
}
