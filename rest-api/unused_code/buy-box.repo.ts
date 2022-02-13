import { HttpService } from '@nestjs/axios';
import { Inject, Logger } from '@nestjs/common';
import { clientNameToId } from '@nx-fornida/backend/core-functions';
import { asin, BuyBoxData, GetOffersResponse, MerchantListing, MerchantPayload } from '@nx-fornida/interfaces';
import { GetOffersResult } from '@scaleleap/selling-partner-api-sdk/lib/api-models/product-pricing-api-model';
import { AxiosResponse } from 'axios';
import { Collection, WithId } from 'mongodb';
import { concat, concatMap, delay, from, map, share, Subject, tap } from 'rxjs';
import { INV_ZAYNTEK, SALES_ALGO } from '../contants';
import { catchErrorStrategy } from '../functions/standard-catch-error-strategy';
import { retryStrat } from '../functions/standard-retry-strategy';
import { Context, ProcessTrace, ProcessResponse, ErrorObj } from '../src/interfaces/process';

type MongoMerchListing = asin | WithId<MerchantListing>;
type MerchantListingCtx = ProcessTrace<MongoMerchListing>;
type MerchantListingsArrayCtx = ProcessTrace<MongoMerchListing[]>;

type BuyBoxResponse = {
  asin: string;
  merchantPayload?: MerchantPayload;
};

export class BuyBoxRepo {
  private readonly logger = new Logger(BuyBoxRepo.name);
  url: string;

  private subject = new Subject<ProcessResponse<BuyBoxResponse>>();
  public processed$ = this.subject.asObservable().pipe(share());

  constructor(
    @Inject(INV_ZAYNTEK)
    private readonly inventory: Collection<MerchantListing>,
    @Inject(SALES_ALGO)
    private readonly salesAlgo: Collection<BuyBoxData>,
    private readonly http: HttpService
  ) {
    const backend = process.env.backend || 'http://localhost:3333';
    this.url = `${backend}/api/${clientNameToId('zayntek')}/amz/pricing/getItemOffers`;
  }

  /**
   * pass an array of items and sequantially process
   * @param items
   * @returns
   */
  public processMultipleRecords$({ payload, ctx }: MerchantListingsArrayCtx) {
    return concat(...payload.map(i => this.processRecord$(this.toMerchantListingCtx(i, ctx))));
  }

  /**
   * entire process for 1 record (asin)
   * @param url the url string for the request
   * @param item Merchantlisting object w/ ctx
   * @returns
   */
  public processRecord$(item: MerchantListingCtx) {
    return this.httpRequest$(this.url, item)
      .pipe(
        /** calculate new analytics data and also continue passing the ctx */
        map(res => {
          /** step 2 use the response to build the data payload */
          try {
            const p: GetOffersResult = res.data.payload;

            const top5 = top5DiffMetrics(p);

            const merchantPayload: MerchantPayload = {
              salesRank: p.Summary?.SalesRankings || null,
              buyBoxMetrics: {
                top1: getTop1(p),
                offersCount: getOffersCount(p),
                top5DiffAvg: top5.avg
                // top5DiffDev: top5.variance
              }
            };
            return { asin: p.ASIN, merchantPayload, ctx: item.ctx };
          } catch (err) {
            throw errorObj({ err, msg: 'buybox processing$ error during payload calculation' });
          }
        }),
        concatMap(({ asin, merchantPayload, ctx }) => {
          /** step 3 update mongo by:
           * update/insert to the sales algo collection,
           * update current sales rank and buybox metrics to inventory zayntek
           */
          return from(
            Promise.all([
              /** update sales algo */
              this.salesAlgo
                .updateOne(
                  { date: new Date(new Date().toDateString() + ' GMT'), asin: asin },
                  {
                    $setOnInsert: {
                      asin: asin,
                      date: new Date(new Date().toDateString() + ' GMT'),
                      top1: merchantPayload.buyBoxMetrics.top1,
                      offersCount: merchantPayload.buyBoxMetrics.offersCount,
                      top5DiffAvg: merchantPayload.buyBoxMetrics.top5DiffAvg
                    },
                    $currentDate: {
                      update_dt: true
                    }
                  },
                  {
                    upsert: true
                  }
                )
                .catch(err => {
                  throw errorObj({ err, msg: 'error with mongo updates step 1' });
                }),
              /** update inventory */
              this.inventory
                .updateOne(
                  { asin: asin },
                  {
                    $set: {
                      ...merchantPayload /** should add the keys of MerchantPayload */
                    }
                  }
                )
                .catch(err => {
                  throw errorObj({ err, msg: 'error with mongo updates step 2' });
                })
            ]).then(res => {
              return ProcessResponse<BuyBoxResponse>('success', { asin, merchantPayload }, item.ctx);
            })
          );
        })
      )
      .pipe(
        // tap((val) => this.logger.log(`processed ${val.payload.asin}`)),
        catchErrorStrategy(ProcessResponse<BuyBoxResponse>('error', { asin: item.payload.asin }, item.ctx)),
        tap(response => this.subject.next(response))
      );
  }

  public toMerchantListingCtx(listingDoc: MongoMerchListing, ctx: Context): MerchantListingCtx {
    return {
      payload: listingDoc,
      ctx: ctx
    };
  }

  private httpRequest$(url: string, item: MerchantListingCtx) {
    return this.http
      .request<GetOffersResponse>({
        method: 'GET',
        url: url,
        params: {
          itemCondition: 'New',
          asin: item.payload.asin
        },
        headers: {
          'Content-Type': 'application/json',
          cronjwt: 'cron'
        }
      })
      .pipe(retryStrat<AxiosResponse<GetOffersResponse>>({ logger: item.ctx, msdelay: 1500, retries: 2 }), delay(250));
  }
}

const getTop1 = (p: GetOffersResult): number => {
  if (!p.Summary.BuyBoxPrices) return 0;
  return p.Summary.BuyBoxPrices.find(x => x.condition == 'new')?.ListingPrice?.Amount || 0;
};

const getOffersCount = (p: GetOffersResult): number => {
  if (p.Summary.BuyBoxEligibleOffers) {
    const newCondition = p.Summary.BuyBoxEligibleOffers.filter(x => x.condition == 'new');
    if (newCondition.length > 0) {
      return newCondition.reduce((a, b) => {
        return { OfferCount: a.OfferCount + b.OfferCount };
      }).OfferCount;
    }
  }
  return 0;
};

const top5DiffMetrics = (p: GetOffersResult) => {
  /** based on prices purely (good thing) */
  const newOffers = p.Offers.filter(x => x.SubCondition == 'new');
  if (newOffers.length > 0) {
    const bestPrice = newOffers[0]?.Shipping?.Amount || 0 + newOffers[0]?.ListingPrice.Amount || 0;
    const next4 = newOffers.slice(1, 5);
    if (next4.length > 0) {
      const diffs = next4.map(x => (x.ListingPrice?.Amount + x.Shipping?.Amount || 0) / bestPrice - 1);
      const avg = diffs.reduce((a, b) => a + b) / diffs.length;
      return {
        avg
      };
    }
  }
  return { avg: 0, variance: 0 };
};

function errorObj({ err, msg }: ErrorObj): ErrorObj {
  return { err, msg };
}
