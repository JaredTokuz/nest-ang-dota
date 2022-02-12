import { Collection } from 'mongodb';
import { DBLogger } from '../classes/db-logger';
import { Context } from '../interfaces/process';

export const makeContext = (collection: Collection<any>): Context => {
	const dbLogger = new DBLogger(collection);
	return {
		dbLogger
	};
};
