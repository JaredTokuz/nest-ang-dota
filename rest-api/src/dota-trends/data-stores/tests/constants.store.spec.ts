import { HttpModule } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Db } from 'mongodb';
import { DatabaseModule } from '../../database/database.module';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { configDotaConstants } from '../../interfaces/dota-constants-sync';
import { OpenDotaService } from '../../services/open-dota.service';
import { ConstantsStore } from '../constants.store';

/**
 * NODE_ENV=test npx jest constants.store.spec.ts --forceExit
 */

describe('ConstantsStore', () => {
  let service: ConstantsStore;
  let db: Db;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, HttpModule],
      providers: [ConstantsStore, OpenDotaService]
    })
      .setLogger(new Logger())
      .compile();

    db = module.get<Db>(DATABASE_CONNECTION);

    service = module.get<ConstantsStore>(ConstantsStore);
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
