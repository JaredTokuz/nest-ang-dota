import { LiveGameDocument } from "./../models/live-matches.interfaces";
import { DATABASE_CONNECTION, MATCHES, LIVE_MATCHES, LVL_TWO_HEROES } from "../constants";
import { MongoClient, Db } from "mongodb";
import { OpenDotaMatch } from "../models/open-dota-match.interface";
import { DOTA_MONGO_URI } from "../../environment.dev";
import { LevelTwoHero } from "../models/level-two-match.interface";

export const databaseProviders = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async (): Promise<Db> => {
      return (await new MongoClient(DOTA_MONGO_URI).connect()).db();
    }
  },
  {
    provide: MATCHES,
    useFactory: async () => {
      return (await new MongoClient(DOTA_MONGO_URI).connect()).db().collection<OpenDotaMatch>(MATCHES);
    }
  },
  {
    provide: LIVE_MATCHES,
    useFactory: async () => {
      return (await new MongoClient(DOTA_MONGO_URI).connect()).db().collection<LiveGameDocument>(LIVE_MATCHES);
    }
  },
  {
    provide: LVL_TWO_HEROES,
    useFactory: async () => {
      return (await new MongoClient(DOTA_MONGO_URI).connect()).db().collection<LevelTwoHero>(MATCHES);
    }
  }
];
