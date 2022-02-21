import { LiveGameDocument } from '../interfaces/live-matches';
import { MongoClient, Db } from 'mongodb';
import { OpenDotaMatch } from '../interfaces/open-dota-match';
import { DOTA_MONGO_URI } from '../../environment.dev';
import { LevelTwoHero } from '../interfaces/level-two-match';
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV_VARIABLES } from '../../app.module';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export const LIVE_MATCHES = 'liveMatches';
export const MATCHES = 'matches';
export const LVL_TWO_HEROES = 'level-two-heroes';

export const databaseProviders: FactoryProvider[] = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async (config: ConfigService<ENV_VARIABLES>): Promise<Db> => {
      try {
        return (await new MongoClient(config.get('DOTA_MONGO_URI')).connect()).db();
      } catch (err) {
        console.error('err at DATABASE_CONNECTION', err);
        console.error('dota', config.get('DOTA_MONGO_URI'));
        console.error('nod evn', config.get('NODE_ENV'));
      }
    },
    inject: [ConfigService]
  },
  {
    provide: MATCHES,
    useFactory: async (config: ConfigService<ENV_VARIABLES>) => {
      return (await new MongoClient(config.get('DOTA_MONGO_URI')).connect()).db().collection<OpenDotaMatch>(MATCHES);
    },
    inject: [ConfigService]
  },
  {
    provide: LIVE_MATCHES,
    useFactory: async (config: ConfigService<ENV_VARIABLES>) => {
      return (await new MongoClient(config.get('DOTA_MONGO_URI')).connect())
        .db()
        .collection<LiveGameDocument>(LIVE_MATCHES);
    },
    inject: [ConfigService]
  },
  {
    provide: LVL_TWO_HEROES,
    useFactory: async (config: ConfigService<ENV_VARIABLES>) => {
      return (await new MongoClient(config.get('DOTA_MONGO_URI')).connect())
        .db()
        .collection<LevelTwoHero>(LVL_TWO_HEROES);
    },
    inject: [ConfigService]
  }
];
