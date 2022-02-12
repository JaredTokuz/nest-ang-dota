import { Collection, ObjectId, WithId } from "mongodb";
import { getWeekNumber } from "../../misc";
import { LoggerRunId } from "./db-logger.interfaces";
import { DateLevel, ErrorTaskRun, Rollup, RollupCategories, TaskName } from "./task-rollup.interface";

/** This class is designed to full manage and create mongo documents that are contain summary data for automations
 * unique by category + date
 * generally the tasks summarize on the daily level however it can do weekly/monthly/quarterly
 */
export class TaskRollup {
  collection: Collection<Rollup>;
  /** first unique value */
  category: RollupCategories;
  /** second unique value */
  dateRollup: string;
  /** document of current Rollup */
  doc: WithId<Rollup>;
  /** shortcut mongo filter for the current Rollup Id */
  idQuery: { _id: ObjectId };
  /** the current task */
  activeTask: { started_at: Date; name: string };

  constructor(collection: Collection<Rollup>, category: RollupCategories, dateLevel: DateLevel = "daily") {
    this.collection = collection;
    this.category = category;
    this.setupDateField(dateLevel);
  }
  private setupDateField(dateLevel: string) {
    const d = new Date();
    switch (dateLevel) {
      case "daily":
        this.dateRollup = d.toDateString();
        break;
      case "weekly":
        this.dateRollup = getWeekNumber(d);
        break;
      case "monthly":
        this.dateRollup = `${d.toLocaleString("default", {
          month: "long"
        })} ${d.getUTCFullYear()}`;
        break;
      case "quarterly":
        throw new Error("quarterly not implemented");
      default:
        throw new Error("the date level selection does not exist");
    }
  }

  /**
   * Check if rollup already exists then create one if not
   * @returns {Rollup}
   */
  rollup() {
    /** Check if the Rollup already exists */
    return this.collection
      .findOne({
        category: this.category,
        dateRollup: this.dateRollup
      })
      .then(value => {
        if (value) {
          this.doc = value;
          this.idQuery = { _id: new ObjectId(this.doc._id) };
          return this.doc;
        } else {
          return this.createRollup();
        }
      })
      .catch(e => {
        console.error("TaskRollup begin failed with:", e.message, e);
        throw new Error("task rollup creation error");
      });
  }
  private async createRollup() {
    return this.collection
      .insertOne({
        category: this.category,
        dateRollup: this.dateRollup,
        createdAt: new Date(),
        tasks: {}
      })
      .then(value => {
        return this.collection.findOne({ _id: new ObjectId(value.insertedId) });
      })
      .then(value => {
        this.doc = value;
        return value;
      });
  }

  task(taskName: TaskName) {
    const task = this.doc.tasks[taskName];
    if (!task) {
      this.doc.tasks[taskName] = {
        title: taskName,
        status: ""
      };
    } else {
      if (task.completed?.date) {
        return "complete";
      }
    }
    this.activeTask.name = taskName;
    this.activeTask.started_at = new Date();
    return this.activeTask;
  }

  markComplete(loggerRunId: LoggerRunId) {
    const d = new Date();
    this.doc.tasks[this.activeTask.name].completed.date = d;
    this.doc.tasks[this.activeTask.name].completed.runId = loggerRunId;
    this.doc.tasks[this.activeTask.name].completed.duration = +d - +this.activeTask.started_at;
    return this.collection.updateOne(this.idQuery, this.doc);
  }

  markError(loggerRunId: LoggerRunId, errorMessage: string, lastLogMessage: string) {
    const d = new Date();
    const e: ErrorTaskRun = {
      message: errorMessage,
      lastLog: lastLogMessage,
      duration: +d - +this.activeTask.started_at,
      date: d,
      runId: loggerRunId
    };
    this.doc.tasks[this.activeTask.name].errors.push(e);
    return this.collection.updateOne(this.idQuery, this.doc);
  }
}
