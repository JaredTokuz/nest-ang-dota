import { HttpModule } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Collection, Db } from 'mongodb';
import { concatAll, concatMap, filter, forkJoin, from, map, of, take, tap, toArray } from 'rxjs';
import { AppTestModule } from '../../../app.test.module';
import { makeContext } from '../../../functions/context';
import { DbLoggerMainFields } from '../../../interfaces/db-logger';
import { range } from '../../../misc';
import { DOTA_DBLOGGER } from '../../constants';
import { DatabaseModule } from '../../database/database.module';
import { DATABASE_CONNECTION, LIVE_MATCHES } from '../../database/database.provider';
import { isLiveGameArray, LiveGameDocument } from '../../interfaces/live-matches';
import { OpenDotaService } from '../../services/open-dota.service';
import { LiveMatchStore } from '../live-match.store';

/**
 NODE_ENV=test npx jest live-match.store.spec.ts --forceExit --verbose --no-cache
 */

describe('LiveMatchStore', () => {
  let store: LiveMatchStore;
  let logger: Collection<DbLoggerMainFields>;
  let col: Collection<LiveGameDocument>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule, DatabaseModule, HttpModule],
      providers: [OpenDotaService, LiveMatchStore]
    })
      .setLogger(new Logger())
      .compile();

    logger = module.get<Db>(DATABASE_CONNECTION).collection(DOTA_DBLOGGER);

    col = module.get<Collection<LiveGameDocument>>(LIVE_MATCHES);

    store = module.get<LiveMatchStore>(LiveMatchStore);
  });

  describe('sync live match tests', () => {
    it('should sync live match data and add to database', done => {
      store
        .sync({ ctx: makeContext(logger), payload: {} })
        .pipe(
          tap(data => {
            expect(data.status == 'success').toBe(true);
            expect(Array.isArray(data.payload)).toBe(true);
          }),
          map(d => {
            const payload = d.payload;
            if (isLiveGameArray(payload)) {
              console.log(`Length of the payload ${payload.length}`);
              return payload;
            }
          }),
          concatAll(),
          concatMap(d => {
            return from(
              col
                .find({ match_id: d.match_id })
                .toArray()
                .then(_d => {
                  expect(_d.length).toBe(1);
                })
            );
          })
        )
        .subscribe({
          complete: () => done()
        });
    });
  });

  describe('Testing emitUnfinished', () => {
    beforeAll(async () => {
      const insertThem: LiveGameDocument[] = [];
      let match_id = 0;
      for (const i of [null, false, true]) {
        match_id++;
        insertThem.push({
          match_id: match_id.toString(),
          activate_time: 123,
          game_finished: i,
          syncDate: new Date(+new Date() - 1000 * 60 * 1)
        });

        match_id++;
        insertThem.push({
          match_id: match_id.toString(),
          activate_time: 456,
          game_finished: i,
          syncDate: new Date(+new Date() - 1000 * 60 * 20)
        });
      }
      await col.insertMany(insertThem);
    });

    it('should emit the correct values only should have 2 values out of the 6', done => {
      forkJoin([
        store.processed$.pipe(
          tap(data => {
            expect(data.status).toBe('success');
            if (data.status == 'success') {
              expect(data.payload.length).toBeGreaterThanOrEqual(2);
            }
          }),
          take(1)
        ),
        store.emitUnfinished({ ctx: makeContext(logger), payload: {} }).pipe(
          tap(data => {
            if (data.status == 'success') {
              console.log(data.payload);
              expect(data.payload.length > 0).toBe(true);
              for (const item of data.payload) {
                expect(item.game_finished).not.toBe(true);
                expect(item.syncDate < new Date(+new Date() - 15 * 60 * 1000));
              }
            }
          })
        )
      ]).subscribe({
        complete: () => done()
      });
    });

    afterAll(async () => {
      const fake_ids = range(10).map(x => x.toString());

      await col.deleteMany({ match_id: { $in: fake_ids } });
    });
  });
});
