import { OpenDotaService } from '../services/open-dota.service';
import { Inject, Injectable } from '@nestjs/common';
import { Db, FindOptions, WithId } from 'mongodb';
import { DATABASE_CONNECTION } from '../constants';
import { configDotaConstants, ConstantConfig } from '../interfaces/dota-constants-sync';
import { firstValueFrom, from, map } from 'rxjs';

@Injectable()
export class ConstantsRepo {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Db,
    private readonly opendota: OpenDotaService
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
  private configSync(config: ConstantConfig) {
    return firstValueFrom(
      this.opendota.constants(config).pipe(
        map(data => {
          /** format based on constant */
          const mongoReadyData = config.format(data);

          from(
            this.db
              .listCollections({
                name: config.collectionName,
                type: 'collection'
              })
              .toArray()
              .then(async collectionSearch => {
                if (collectionSearch.length > 0)
                  await this.db
                    .collection(config.collectionName)
                    .drop()
                    .catch(e => {
                      throw new Error(`Dota Constant Collection Drop() error, ${e.toString()}`);
                    });
                return this.db.collection(config.collectionName).insertMany(mongoReadyData);
              })
              .catch(e => {
                throw new Error(`Dota Constant Collection mongo error, ${e.toString()}`);
              })
          );
        })
      )
    );
  }

  /**
   * a simple query wrapper for the services only collection
   * @param query a filter operation to be used to query the collection
   * @returns an array of mongo documents matching the query
   */
  get<T>(collectionName: string, query: T, findOptions?: FindOptions) {
    /** check if it is one from the config */
    const config = configDotaConstants.find(x => x.collectionName == collectionName);
    if (!config) throw new Error(`Collection name is not valid ${collectionName}`);
    return this.db.collection(collectionName).find(query, findOptions).toArray();
  }
}
