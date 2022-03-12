import { OpenDotaService } from '../services/open-dota.service';
import { Inject, Injectable } from '@nestjs/common';
import { Db, FindOptions, WithId } from 'mongodb';
import { configDotaConstants, ConstantConfig } from '../interfaces/dota-constants-sync';
import { firstValueFrom, from, map } from 'rxjs';
import { DATABASE_CONNECTION } from '../database/database.provider';

@Injectable()
export class ConstantsStore {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Db,
    @Inject(OpenDotaService) private readonly opendota: OpenDotaService
  ) {}

  /**
   * gets the constants data, parses the important bits
   * and upserts to the database
   * @returns {void} from mongo db
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

          return from(
            this.db
              .collection(config.collectionName)
              .deleteMany({})
              .then(() => {
                return this.db.collection(config.collectionName).insertMany(mongoReadyData);
              })
              .catch(e => {
                throw new Error(`Dota Constant Collection config sync error, ${e.toString()}`);
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
