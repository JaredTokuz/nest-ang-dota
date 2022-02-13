import { HttpModule } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Collection } from 'mongodb';
import { DOTA_DBLOGGER, LIVE_MATCHES } from 'src/dota-trends/constants';
import { DatabaseModule } from 'src/dota-trends/database/database.module';
import { LiveGameDocument } from 'src/dota-trends/interfaces/live-matches';
import { DbLoggerMainFields } from '../../../interfaces/db-logger';
import { LiveMatchRepo } from '../live-match.repo';

/**
 * testing=true npx jest buy-box.repo.spec.ts --forceExit
 */

describe('LiveMatchRepo', () => {
  let repo: LiveMatchRepo;
  let logger: Collection<DbLoggerMainFields>;
  let col: Collection<LiveGameDocument>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, HttpModule],
      providers: [LiveMatchRepo]
    })
      .setLogger(new Logger())
      .compile();

    logger = module.get<Collection<DbLoggerMainFields>>(DOTA_DBLOGGER);

    col = module.get<Collection<LiveGameDocument>>(LIVE_MATCHES);

    repo = module.get<LiveMatchRepo>(LiveMatchRepo);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });
});
