import { TaskRollup } from "../logging-stuff/task-rollup";
import { DBLogger } from "../logging-stuff/db-logger";

export interface ContextObject {
  logger: DBLogger;
  taskRollup?: TaskRollup;
}

export interface DataPass<T> extends ContextObject {
  data: T;
}
