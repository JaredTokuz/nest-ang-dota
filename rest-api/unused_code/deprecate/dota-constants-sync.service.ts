import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../src/dota-trends/constants';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Filter, Db, FindOptions } from 'mongodb';
import { configDotaConstants, ConstantConfig } from '../../src/dota-trends/interfaces/dota-constants-sync';

@Injectable()
export class DotaConstantsSyncService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: Db,
    private httpService: HttpService
  ) {}

  /**
   * gets the live match data, parses the important bits
   * and upserts to the database
   * @returns bulkWriteResult from mongo db
   */
  async sync(resource?: string) {
    try {
      if (resource) {
        /** make sure it exists */
        const config = configDotaConstants.find(x => x.resource == resource);
        if (!config) throw new Error(`Resource is not a valid constant ${resource}`);
        await this.configSync(config);
      } else {
        /** else loop thru and sync all */
        for (const config of configDotaConstants) {
          await this.configSync(config);
        }
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * reusable for syncing constants based on a config object
   * @param config the constant config used
   * @returns mongo insertMany result
   */
  private async configSync(config: ConstantConfig) {
    const { data } = await firstValueFrom(this.httpService.get<any>(`constants/${config.resource}`));

    /** format based on constant */
    const mongoReadyData = config.format(data);

    const colRecord = await this.db
      .listCollections({
        name: config.collectionName,
        type: 'collection'
      })
      .toArray();

    if (colRecord.length > 0)
      await this.db
        .collection(config.collectionName)
        .drop()
        .catch(e => {
          throw new Error(`Dota Constant Collection Drop() error, ${e.toString()}`);
        });
    return this.db.collection(config.collectionName).insertMany(mongoReadyData);
  }

  /**
   * a simple query wrapper for the services only collection
   * @param query a filter operation to be used to query the collection
   * @returns an array of mongo documents matching the query
   */
  get(collectionName: string, query: Filter<any>, findOptions?: FindOptions) {
    /** check if it is one from the config */
    const config = configDotaConstants.find(x => x.collectionName == collectionName);
    if (!config) throw new Error(`Collection name is not valid ${collectionName}`);
    return this.db.collection(collectionName).find(query, findOptions).toArray();
  }
}
