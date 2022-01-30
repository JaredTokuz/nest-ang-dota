import { DATABASE_CONNECTION, MATCHES, LIVE_MATCHES } from "../constants";
import { MongoClient, Db } from "mongodb";
import { OpenDotaMatchResponse } from "../models/open-dota-match-response.interface";
import { DOTA_MONGO_URI } from "../../environment.dev";

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
      return (await new MongoClient(DOTA_MONGO_URI).connect()).db().collection<OpenDotaMatchResponse>(MATCHES);
    }
  },
  {
    provide: LIVE_MATCHES,
    useFactory: async () => {
      return (await new MongoClient(DOTA_MONGO_URI).connect()).db().collection<OpenDotaMatchResponse>(LIVE_MATCHES);
    }
  }
];
