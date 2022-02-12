import { Collection, InsertOneResult } from "mongodb";
import { randomBytes } from "crypto";
import { Logger } from "@nestjs/common";
import { LoggerRunId, LogType, SharedFields } from "./db-logger.interfaces";
import { from } from "rxjs";

/** TODO perhaps someday create rxjs based solution in order to gurantee in order processesing */

/** This db logger is for creating inside a finite process; handles grouping logs together and marking their order in a specified collection
 * the runId can be queried to get all logs for the same logger
 * logs should be unique by runId+seqNo however this may not be 100% (observables could fix this with concatmap?)
 */
export class DBLogger {
  private readonly logger = new Logger(DBLogger.name);
  /** uuid to bundle multiple logs; create a new dbLogger for a fresh uuid */
  runId: LoggerRunId;
  /** increment per log to track the log order */
  private seqNo: number;
  lastInsert: InsertOneResult;
  lastLogAt: Date;
  lastMessage: string;
  constructor(private collection: Collection<SharedFields>) {
    this.collection = collection;
    this.seqNo = 0;
    this.runId = `${new Date().toJSON()}-${randomBytes(8).toString("hex")}`;
    this.lastLogAt = new Date();
  }

  /**
   * the user log function which streamlines processes logging to a collection
   * @param doc simple doc which requires the main client fields
   */
  logasync<T>(type: LogType, message: string, payload?: T) {
    const d = new Date();
    const processedDoc = {
      createdAt: d,
      seqNo: this.seqNo,
      runId: this.runId,
      message,
      type,
      diffMS: +d - +this.lastLogAt,
      payload: payload
    };
    this.logger[type](message);
    return this.insertLog(processedDoc)
      .then(insertOneResult => {
        this.seqNo++;
        this.lastInsert = insertOneResult;
        this.lastLogAt = new Date();
        this.lastMessage = message;
      })
      .catch(e => {
        console.error("DbLogger log failed with:", e.message, e);
      });
  }

  /**
   * the user log function which streamlines processes logging to a collection with subscription
   * @param doc simple doc which requires the main client fields
   */
  log<T>(type: LogType, message: string, payload?: T) {
    const d = new Date();
    const processedDoc = {
      createdAt: d,
      seqNo: this.seqNo,
      runId: this.runId,
      message,
      type,
      diffMS: +d - +this.lastLogAt,
      payload: payload
    };
    from(
      this.insertLog(processedDoc)
        .then(insertOneResult => {
          this.seqNo++;
          this.lastInsert = insertOneResult;
          this.lastLogAt = new Date();
          this.lastMessage = message;
        })
        .catch(e => {
          console.error("DbLogger log failed with:", e.message, e);
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
  private insertLog<T extends SharedFields>(doc: T) {
    return this.collection.insertOne({
      ...doc
    });
  }
}
