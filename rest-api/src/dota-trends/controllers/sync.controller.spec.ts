import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { Db } from 'mongodb';
import { AppTestModule } from '../../app.test.module';
import { daysToMs, unixTimestamp } from '../../misc';
import { DOTA_DBLOGGER } from '../constants';
import { ConstantsStore } from '../data-stores/constants.store';
import { LevelTwoMatchesStore } from '../data-stores/level-two-matches.store';
import { LiveMatchStore } from '../data-stores/live-match.store';
import { MatchesStore } from '../data-stores/matches.store';
import { DatabaseModule } from '../database/database.module';
import { DATABASE_CONNECTION, LIVE_MATCHES, LVL_TWO_HEROES, MATCHES } from '../database/database.provider';
import { LiveGameDocument } from '../interfaces/live-matches';
import { OpenDotaMatch } from '../interfaces/open-dota-match';
import { OpenDotaService } from '../services/open-dota.service';
import { SyncController } from './sync.controller';

/**
 * NODE_ENV=test npx jest ./sync.controller.spec.ts --forceExit --verbose
 */

describe('SyncController', () => {
  let controller: SyncController;
  let db: Db;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule, DatabaseModule, HttpModule],
      controllers: [SyncController],
      providers: [LevelTwoMatchesStore, MatchesStore, OpenDotaService, LiveMatchStore, ConstantsStore]
    }).compile();

    db = module.get<Db>(DATABASE_CONNECTION);

    controller = module.get<SyncController>(SyncController);
  });

  const fake_match_id = 123;
  const fake_match_id_stays = 456;

  it('sunday maintenance deletes old records', async () => {
    await Promise.all([
      db.collection<LiveGameDocument>(LIVE_MATCHES).insertMany([
        {
          match_id: fake_match_id.toString(),
          activate_time: unixTimestamp(new Date(+new Date() - daysToMs(31))),
          game_finished: null,
          syncDate: new Date()
        },
        {
          match_id: fake_match_id_stays.toString(),
          activate_time: unixTimestamp(new Date(+new Date() - daysToMs(1))),
          game_finished: null,
          syncDate: new Date()
        }
      ]),

      db.collection<any>(MATCHES).insertMany([
        {
          match_id: fake_match_id
        },
        {
          match_id: fake_match_id_stays
        }
      ]),

      db.collection<any>(LVL_TWO_HEROES).insertMany([
        {
          match_id: fake_match_id
        },
        {
          match_id: fake_match_id_stays
        }
      ]),

      db.collection<any>(DOTA_DBLOGGER).insertMany([
        {
          createdAt: new Date(+new Date() - daysToMs(31)),
          payload: 'test'
        },
        {
          createdAt: new Date(+new Date() - daysToMs(1)),
          payload: 'test_stay'
        }
      ])
    ]);

    await controller.newsundayMaintenance();

    await Promise.all([
      db
        .collection<LiveGameDocument>(LIVE_MATCHES)
        .find({
          match_id: { $in: [fake_match_id.toString(), fake_match_id_stays.toString()] }
        })
        .toArray(),

      db
        .collection<any>(MATCHES)
        .find({
          match_id: { $in: [fake_match_id, fake_match_id_stays] }
        })
        .toArray(),

      db
        .collection<any>(LVL_TWO_HEROES)
        .find({
          match_id: { $in: [fake_match_id, fake_match_id_stays] }
        })
        .toArray(),

      db
        .collection<any>(DOTA_DBLOGGER)
        .find({
          payload: { $in: ['test', 'test_stay'] }
        })
        .toArray()
    ]).then(([live, match, lvl2, logs]) => {
      expect(live.find(x => x.match_id == fake_match_id_stays.toString())).toBeTruthy();
      expect(match.find(x => x.match_id == fake_match_id_stays)).toBeTruthy();
      expect(lvl2.find(x => x.match_id == fake_match_id_stays)).toBeTruthy();
      expect(logs.find(x => x.payload == 'test_stay')).toBeTruthy();
    });
  });

  afterAll(async () => {
    await Promise.all([
      db.collection<LiveGameDocument>(LIVE_MATCHES).deleteMany({
        match_id: fake_match_id_stays.toString()
      }),

      db.collection<any>(MATCHES).deleteMany({
        match_id: fake_match_id_stays
      }),

      db.collection<any>(LVL_TWO_HEROES).deleteMany({
        match_id: fake_match_id_stays
      }),

      db.collection<any>(DOTA_DBLOGGER).deleteMany({
        payload: 'test_stay'
      })
    ]);
  });
});
