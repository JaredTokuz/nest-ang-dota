import { LiveGameDocument } from '../interfaces/live-matches';
import { MongoClient, Db } from 'mongodb';
import { OpenDotaMatch } from '../interfaces/open-dota-match';
import { DOTA_MONGO_URI } from '../../environment.dev';
import { LevelTwoHero } from '../interfaces/level-two-match';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export const LIVE_MATCHES = 'liveMatches';
export const MATCHES = 'matches';
export const LVL_TWO_HEROES = 'level-two-heroes';

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
