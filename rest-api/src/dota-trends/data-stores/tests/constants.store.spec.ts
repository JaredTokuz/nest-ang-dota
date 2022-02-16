import { HttpModule } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Db } from 'mongodb';
import { DatabaseModule } from '../../database/database.module';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { configDotaConstants } from '../../interfaces/dota-constants-sync';
import { OpenDotaService } from '../../services/open-dota.service';
import { ConstantsRepo } from '../constants.store';

/**
 * testing=true npx jest constants.store.spec.ts --forceExit
 */

describe('ConstantsRepo', () => {
  let service: ConstantsRepo;
  let db: Db;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, HttpModule],
      providers: [ConstantsRepo, OpenDotaService]
    })
      .setLogger(new Logger())
      .compile();

    db = module.get<Db>(DATABASE_CONNECTION);

    service = module.get<ConstantsRepo>(ConstantsRepo);
  });

  it('should sync properly and get finds data', async () => {
    for (const conf of configDotaConstants) {
      await db.collection(conf.collectionName).deleteMany({});
    }

    await service.sync();

    for (const conf of configDotaConstants) {
      await service.get(conf.collectionName, {}).then(data => {
        expect(data.length).toBeTruthy();
      });
    }
  });
});
