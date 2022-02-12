import { LevelTwoHero } from "../interfaces/level-two-match";
import { LiveMatchRepo } from "../repositories/live-match.repo";
import { difference, unixTimestamp } from "../../misc";
import { Rollup, TaskName } from "../logging-stuff/task-rollup.interface";
import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SharedFields } from "../logging-stuff/db-logger.interfaces";
import { DBLogger } from "../logging-stuff/db-logger";
import { TaskRollup } from "../logging-stuff/task-rollup";
import { DATABASE_CONNECTION, LIVE_MATCHES, LVL_TWO_HEROES, MATCHES } from "../constants";
import { Db } from "mongodb";
import { LiveGameDocument } from "../interfaces/live-matches";
import { OpenDotaMatch } from "../interfaces/open-dota-match";
import { ContextObject } from "../interfaces/context-object";

interface DailyLiveSync extends Rollup {
  [key: string]: any;
}
interface SundayMaintenance extends Rollup {
  [key: string]: any;
}
/** Service that runs cron schedules.
 * Uses DbLogger & TaskRollUp to build lightweight logging solution
 */
@Injectable()
export class AutomateSyncService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: Db,
    private liveRepo: LiveMatchRepo
  ) {}

  @Cron("0 0 */2 ? * *")
  async liveMatchSync() {
    /** Setup */
    const taskRollup = new TaskRollup(this.db.collection("taskRollUp"), "Daily Live Match Sync", "daily");
    const dbLogger = new DBLogger(this.db.collection("dblogger"));
    const ctx: ContextObject = {
      logger: dbLogger,
      taskRollup: taskRollup
    };

    await taskRollup.rollup();
    /** create variable for a unique task name */
    const gmtHour = new Date().toJSON().split(":")[0]; /** gets the GMT hour */
    const taskName = this.liveMatchSync.name + `.${gmtHour}`;
    const task = await taskRollup.task(taskName);
    if (task == "complete") {
      await dbLogger.log("debug", `Already complete: ${taskName}`);
      return;
    } else {
      /** run main job */
      this.liveRepo.requestSync({ ...ctx, data: "new" });
    }
  }

  @Cron("0 0 * ? * sun")
  async sundayMaintenance() {
    /** Setup */
    const taskRollup = new TaskRollup(this.db.collection("taskRollUp"), "Sunday Maintenance Card", "weekly");
    const dbLogger = new DBLogger(this.db.collection("dblogger"));
    const ctx: ContextObject = {
      logger: dbLogger
    };

    await taskRollup.rollup();

    /** TASK 1 = Expiring the liveMatches & matches */
    let taskName: TaskName, task;
    taskName = "Expire Matches";
    task = await taskRollup.task(taskName);
    if (task == "complete") {
      await dbLogger.log("debug", `Already complete: ${taskName}`);
      return;
    } else {
      try {
        /** run main job */
        const liveMatchesCollection = this.db.collection<LiveGameDocument>(LIVE_MATCHES);
        const matchesCollection = this.db.collection<OpenDotaMatch>(MATCHES);
        const levelTwoHeroes = this.db.collection<LevelTwoHero>(LVL_TWO_HEROES);

        const d = new Date();
        const delta = 4;
        d.setMonth(d.getMonth() - delta);
        const unixTime = unixTimestamp(d);

        /** delete the matches that are ready to expire */
        await liveMatchesCollection.deleteMany({ activate_time: { $lte: unixTime } }).then(async val => {
          await dbLogger.log("debug", `${taskName} deleteMany from ${LIVE_MATCHES} ${val}`, val);
        });

        /** check and delete match_ids only inside matches collection
         * live matches may contain match_ids only on that collection since unfinished not yet parsed games
         */
        let page = 0;
        const pageSize = 100;
        do {
          const batch = await matchesCollection
            .find({}, { projection: { match_id: 1 } })
            .skip(page)
            .limit(pageSize)
            .toArray();
          if (batch.length > 0) {
            const match_idStringd = batch.map(x => x.match_id.toString());
            const liveDocsExist = await liveMatchesCollection.find({ match_id: { $in: match_idStringd } }).toArray();
            if (liveDocsExist.length != batch.length) {
              const orphans = [
                ...difference<string>(new Set(match_idStringd), new Set(liveDocsExist.map(x => x.match_id)))
              ];
              await dbLogger.log("error", `deleting orphan ${MATCHES} records... ${orphans.length}`, {
                orphans: orphans
              });
              await matchesCollection
                .deleteMany({
                  match_id: { $in: orphans.map(x => Number(x)) }
                })
                .then(async val => {
                  await dbLogger.log("debug", `${MATCHES} deleteMany orphans`, val);
                });
            }
            page += pageSize;
          } else {
            break;
          }
        } while (true);

        /** delete level two match data here as well  */
        page = 0;
        do {
          const batch = await levelTwoHeroes
            .find({}, { projection: { match_id: 1 } })
            .skip(page)
            .limit(pageSize)
            .toArray();
          if (batch.length > 0) {
            const match_idStringd = batch.map(x => x.match_id.toString());
            /** TODO NEED To delete level two match data here as well  */
            const liveDocsExist = await liveMatchesCollection.find({ match_id: { $in: match_idStringd } }).toArray();
            if (liveDocsExist.length != batch.length) {
              const orphans = [
                ...difference<string>(new Set(match_idStringd), new Set(liveDocsExist.map(x => x.match_id)))
              ];
              await dbLogger.log("error", `deleting orphan ${MATCHES} records... ${orphans.length}`, {
                orphans: orphans
              });
              await levelTwoHeroes
                .deleteMany({
                  match_id: { $in: orphans.map(x => Number(x)) }
                })
                .then(async val => {
                  await dbLogger.log("debug", `${MATCHES} deleteMany orphans`, val);
                });
            }
            page += pageSize;
          } else {
            break;
          }
        } while (true);

        await dbLogger.log("debug", `Complete: ${taskName} ${d} month old`);
        await taskRollup.markComplete(dbLogger.runId);
      } catch (e) {
        /** catch on error */
        await dbLogger.log("debug", `Failed: ${taskName} ${e.toString()}`);
        await taskRollup.markError(dbLogger.runId, e.toString(), dbLogger.lastMessage);
      }
    }

    /** TASK 2 = Expiring the logs collection(s) */
    taskName = "Expire Logs";
    task = await taskRollup.task(taskName);
    if (task == "complete") {
      await dbLogger.log("debug", `Already complete: ${taskName}`);
      return;
    } else {
      /** run main job */
      const d = new Date();
      const delta = 1;
      d.setMonth(d.getMonth() - delta);

      await this.db
        .collection<SharedFields>("dblogger")
        .deleteMany({ createdAt: { $lte: d } })
        .then(async val => {
          /** then on success */
          await dbLogger.log("debug", `Complete: ${taskName} ${d} month old`, val);
          return taskRollup.markComplete(dbLogger.runId);
        })
        .catch(async e => {
          /** catch on error */
          await dbLogger.log("debug", `Failed: ${taskName} ${e.toString()}`);
          return taskRollup.markError(dbLogger.runId, e.toString(), dbLogger.lastMessage);
        });
    }

    /** TASK 3 = Expiring the task rollup collection */
    taskName = "Expire Task Rollups";
    task = await taskRollup.task(taskName);
    if (task == "complete") {
      await dbLogger.log("debug", `Already complete: ${taskName}`);
      return;
    } else {
      /** run main job */
      const d = new Date();
      const delta = 1;
      d.setMonth(d.getMonth() - delta);

      await this.db
        .collection<Rollup>("taskRollUp")
        .deleteMany({ createdAt: { $lte: d } })
        .then(async val => {
          /** then on success */
          await dbLogger.log("debug", `Complete: ${taskName} ${d} month old`, val);
          return taskRollup.markComplete(dbLogger.runId);
        })
        .catch(async e => {
          /** catch on error */
          await dbLogger.log("debug", `Failed: ${taskName} ${e.toString()}`);
          return taskRollup.markError(dbLogger.runId, e.toString(), dbLogger.lastMessage);
        });
    }
  }
}
