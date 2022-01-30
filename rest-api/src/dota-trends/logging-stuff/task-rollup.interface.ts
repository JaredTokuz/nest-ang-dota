import { LoggerRunId } from './db-logger.interfaces';

/** '' is the init value */
export type StatusType = 'complete' | 'failed' | '';

export interface CompleteTask {
  date: Date;
  runId: LoggerRunId;
  /** duration in seconds */
  duration: number;
}

export interface Task {
  title: string;
  status: StatusType;
  description?: string;
  completed?: CompleteTask;
  errors?: ErrorTaskRun[];
}

export interface ErrorTaskRun {
  message: string;
  lastLog: string;
  duration: number;
  date: Date;
  runId: LoggerRunId;
}

export type RollupCategories = 'Sunday Maintenance Card' | 'Daily Live Match Sync';

export type DateLevel = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/** Task names should be unique and become visible as Title for the {Task},
 * examples:
 *    [Sync-00,Sync-02,Sync-04] <- UTC hour format
 *    [Expire Cards, Expire Logs, Expire Matches] <- the same job can be routinely scheduled to retry throughout a time period but if its completed it can skip
 * */
export type TaskName = string;

/** This is unique by the category + date; this interface can be extended to add custom properties for Rollup categories */
export interface Rollup {
  category: RollupCategories;
  /** depends on datelevel daily : new Date().toDateString() can be parsed => new Date(Date.parse(new Date().toDateString()))*/
  dateRollup: string;
  description?: string;
  tasks: { [taskName: string]: Task };
  /** the initial creation date */
  createdAt: Date;
}
