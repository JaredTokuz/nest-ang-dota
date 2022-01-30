export const DATABASE_CONNECTION = "DATABASE_CONNECTION";
export const OPENDOTA_BASE_URL = "https://api.opendota.com/api";
export const LIVE_MATCHES = "liveMatches";
export const MATCHES = "matches";

/** some constants are not retriavable from the api...
 * so manually create them here
 */

export const ACTION_IDS = {
  "1": "move position",
  "2": "move target",
  "3": "attack position",
  "4": "attack target",
  "5": "cast position",
  "6": "cast target",
  "8": "cast no target",
  "10": "hold position",
  "24": "glyph",
  "31": "scan"
};

export const GOLD_REASONS = {
  "0": "other",
  "1": "death",
  "11": "building",
  "12": "hero",
  "13": "creep",
  "14": "neutrals",
  "15": "roshan",
  "17": "rune",
  "20": "ward"
};

export const XP_REASONS = {
  "0": "other",
  "1": "hero",
  "2": "creep",
  "3": "roshan"
};
