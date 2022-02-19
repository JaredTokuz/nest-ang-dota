import { HttpModule } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MerchantListing } from '@nx-fornida/interfaces';
import { Collection } from 'mongodb';
import { from, concatMap, debounceTime, take } from 'rxjs';
import { DBLogger } from '../classes/db-logger';
import { DbLoggerMainFields } from '../interfaces/db-logger';
import { AMZN_ALGO_SCHEDULER_LOGS, INV_ZAYNTEK } from '../contants';
import { DatabaseModule } from '../../database/database.module';

import { BuyBoxRepo } from '../../../../unused_code/buy-box.repo';

/**
 * testing=true npx jest buy-box.repo.spec.ts --forceExit
 */

describe('BuyBoxRepo', () => {
  let repo: BuyBoxRepo;
  let logger: Collection<DbLoggerMainFields>;
  let inv: Collection<MerchantListing>;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      imports: [HttpModule, DatabaseModule],
      providers: [BuyBoxRepo]
    })
      .setLogger(new Logger())
      .compile();

    logger = app.get<Collection<DbLoggerMainFields>>(AMZN_ALGO_SCHEDULER_LOGS);

    inv = app.get<Collection<MerchantListing>>(INV_ZAYNTEK);

    repo = app.get<BuyBoxRepo>(BuyBoxRepo);
  }, 1000 * 7);

  describe('getData', () => {
    it(
      'should process the data in test db',
      done => {
        const dbLogger = new DBLogger(logger);
        const ctx = {
          dbLogger
        };

        console.log('Set flag for random samples');

        /** set up the subscription first because share does not store values like shareReplay */
        repo.processing$.pipe(take(10)).subscribe({
          next: async v => {
            await inv
              .findOne({
                asin1: v.asin
              })
              .then(doc => {
                expect(Object.keys(doc)).toContain('salesRank');
                expect(Object.keys(doc)).toContain('buyBoxMetrics');
              });
          },
          error: e => {
            console.log('error out');
            done(e);
          },
          complete: () => {
            console.log('complete 1');
            done();
          }
        });

        /** set the flag inside the database for 10 random docs */
        inv
          .aggregate<MerchantListing>([{ $sample: { size: 10 } }])
          .forEach(doc => {
            repo.syncProduct(doc, ctx);
          })
          .finally(() => {});
      },
      20 * 1000
    );

    it(
      'should process this single bad item and throw',
      () => {
        const dbLogger = new DBLogger(logger);
        const ctx = {
          dbLogger
        };

        return repo.syncProduct(['123'], ctx).catch(err => {
          expect(err).toBeTruthy();
          console.log(err);
        });
      },
      5 * 1000
    );

    it(
      'should process this single item successfully',
      done => {
        let c = 0;
        /** set up the subscription first because share does not store values like shareReplay */
        repo.processing$.pipe(take(1)).subscribe({
          next: async v => {
            c += 1;
            console.log('c ', c);
            await inv
              .findOne({
                asin1: v.asin
              })
              .then(doc => {
                expect(Object.keys(doc)).toContain('salesRank');
                expect(Object.keys(doc)).toContain('buyBoxMetrics');
              });
          },
          error: e => {
            console.log('error out 3');
            done(e);
          },
          complete: () => {
            console.log('complete 3');
            done();
          }
        });

        const dbLogger = new DBLogger(logger);
        const ctx = {
          dbLogger
        };
        repo.syncProduct('B001BOJCOY', ctx);
      },
      10 * 1000
    );

    it(
      'should fill queue and process all',
      done => {
        /** set up the subscription first because share does not store values like shareReplay */
        repo.processing$
          .pipe(
            concatMap(v => {
              return from(
                inv
                  .findOne({
                    asin1: v.asin
                  })
                  .then(doc => {
                    expect(Object.keys(doc)).toContain('salesRank');
                    expect(Object.keys(doc)).toContain('buyBoxMetrics');
                  })
              );
            }),
            debounceTime(1000 * 8)
          )
          .subscribe({
            next: v => {
              console.log('last one', v);
              done();
            },
            error: e => {
              console.log('error out 4');
              done(e);
            },
            complete: () => {
              console.log('complete 4');
              done();
            }
          });

        const dbLogger = new DBLogger(logger);
        const ctx = {
          dbLogger
        };
        repo.fillQueue({}, ctx);
      },
      50 * 1000
    );
  });
});
