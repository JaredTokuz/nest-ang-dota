import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { Collection, Db, WithId } from 'mongodb';
import { concatMap, forkJoin, from, take, tap } from 'rxjs';
import { makeContext } from '../../../functions/context';
import { DbLoggerMainFields } from '../../../interfaces/db-logger';
import { DOTA_DBLOGGER } from '../../constants';
import { DatabaseModule } from '../../database/database.module';
import { DATABASE_CONNECTION, LVL_TWO_HEROES, MATCHES } from '../../database/database.provider';
import { LevelTwoHero } from '../../interfaces/level-two-match';
import { OpenDotaMatch } from '../../interfaces/open-dota-match';
import { OpenDotaService } from '../../services/open-dota.service';
import { LevelTwoMatchesStore } from '../level-two-matches.store';
import { LiveMatchStore } from '../live-match.store';
import { MatchesStore } from '../matches.store';

/**
 * NODE_ENV=test npx jest ./level-two-matches.store.spec.ts --forceExit --verbose
 */

describe('LevelTwoMatchesStore', () => {
  let service: LevelTwoMatchesStore;
  let logger: Collection<DbLoggerMainFields>;
  let lvlTwocol: Collection<LevelTwoHero>;
  let matchcol: Collection<OpenDotaMatch>;
  let match_data: WithId<OpenDotaMatch>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, HttpModule],
      providers: [LevelTwoMatchesStore, MatchesStore, OpenDotaService, LiveMatchStore]
    }).compile();

    logger = module.get<Db>(DATABASE_CONNECTION).collection(DOTA_DBLOGGER);
    lvlTwocol = module.get(LVL_TWO_HEROES);
    matchcol = module.get(MATCHES);
    service = module.get<LevelTwoMatchesStore>(LevelTwoMatchesStore);

    match_data = await matchcol.findOne({});
  });

  it('should calculate level two data and found in the processed and database', done => {
    forkJoin([
      service.calculate(match_data, makeContext(logger)).pipe(
        tap(data => {
          expect(data.status == 'success').toBe(true);
        })
      ),
      service.processed$.pipe(
        concatMap(data => {
          if (data.status == 'success') {
            return from(lvlTwocol.findOne({ match_id: match_data.match_id }).then(doc => expect(doc).toBeTruthy()));
          }
        }),
        take(1)
      )
    ]).subscribe({
      complete: () => done()
    });
  });
});
