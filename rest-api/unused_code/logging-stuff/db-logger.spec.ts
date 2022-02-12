import { MongoClient, Db } from 'mongodb';
import { DBLogger } from './db-logger';

// (await new MongoClient(dotenv.get('.env.test')('DOTA_MONGO_URI')).connect()).db();

describe('DbLogger', () => {
  it('should be defined', async () => {
    // expect(new DbLogger()).toBeDefined();
    // const dbLogger = new DBLogger(db.collection('dblogger'));
    /** recreate error and log it */
    // await dbLogger.log('error', e.toString());
    /** db call and make sure every field is correct */
    /** create data json */
    // await dbLogger.log('log', `Expired fields to delete ${data.count}`, { data });
    /** db call and make sure every field is correct */
    // await dbLogger.log('debug', 'Complete');
    /** db call and make sure every field is correct */
  });
});
