import { Collection, InsertOneResult } from 'mongodb';
import { randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';
import { LoggerRunId, LogType, DbLoggerMainFields, DbLogger } from '../interfaces/db-logger';
import { from } from 'rxjs';

/** TODO perhaps someday create rxjs based solution in order to gurantee in order processesing */

/** This db logger is for creating inside a finite process; handles grouping logs together and marking their order in a specified collection
 * the runId can be queried to get all logs for the same logger
 * logs should be unique by runId+seqNo however this may not be 100% (observables could fix this with concatmap?)
 */
export class DBLogger implements DbLogger {
	private readonly logger = new Logger(DBLogger.name);
	/** uuid to bundle multiple logs; create a new dbLogger for a fresh uuid */
	runId: LoggerRunId;
	/** increment per log to track the log order */
	private seqNo: number;
	lastInsert: InsertOneResult;
	lastLogAt: Date;
	lastMessage: string;
	constructor(private collection: Collection<DbLoggerMainFields>) {
		this.collection = collection;
		this.seqNo = 0;
		this.runId = `${new Date().toJSON()}-${randomBytes(8).toString('hex')}`;
		this.lastLogAt = new Date();
	}

	/**
	 * the user log function which streamlines processes logging to a collection with subscription
	 * @param doc simple doc which requires the main client fields
	 */
	log(type: LogType, message: string, payload?: any) {
		const d = new Date();
		from(
			this.insertLog({
				createdAt: d,
				seqNo: this.seqNo,
				runId: this.runId,
				message,
				type,
				diffMS: +d - +this.lastLogAt,
				payload: payload
			})
				.then((insertOneResult) => {
					this.seqNo++;
					this.lastInsert = insertOneResult;
					this.lastLogAt = new Date();
					this.lastMessage = message;
				})
				.catch((e) => {
					console.error('DbLogger log failed with:', e.message, e);
				})
		).subscribe({
			complete: () => this.logger[type](message)
		});
	}

	/**
	 * private mongo insert wrapper showing the type requirement
	 * @param doc fully complete document containing all the main fields
	 * @returns {InsertOneResult} mongo insert one result
	 */
	private insertLog(doc: DbLoggerMainFields) {
		return this.collection.insertOne({
			...doc
		});
	}
}
