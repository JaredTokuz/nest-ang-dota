import { Logger } from "@nestjs/common";
import { AxiosResponse, AxiosError } from "axios";
import { delay, delayWhen, map, Observable, retryWhen, scan, take, tap, timer } from "rxjs";
import { DBLogger } from "../logging-stuff/db-logger";

export const standardRetryStrategy = <T>(obs: Observable<AxiosResponse<T>>, opts: RetryOpts): Observable<T> => {
  return obs.pipe(
    map(resp => resp.data as T),
    retryStrat(opts)
  );
};

type ErrorObj = {
  err: Error;
  /** msg string for the logg */
  msg: string;
};

export function errorObj({ err, msg }: ErrorObj): ErrorObj {
  return { err, msg };
}

export const isAxiosError = (obj: any): obj is AxiosError => {
  return "isAxiosError" in obj;
};

export const minutesInMS = (minutes: number) => minutes * 60 * 1000;

type RetryOpts = {
  logger?: Logger | ScheduleContext;
  msdelay?: number;
  retries?: number;
};

const retryStrat = <T>(
  { logger, msdelay, retries }: RetryOpts = {
    msdelay: 0,
    retries: 0
  }
) => {
  return retryWhen<T>(error =>
    error.pipe(
      scan((acc, error) => ({ count: acc.count + 1, error }), {
        count: 0,
        error: undefined
      }),
      map(current => {
        /** retry twice */
        if (current.count > retries) {
          throw errorObj({ err: current.error, msg: "retryStrat error, all retries failed" });
        }
        return current;
      }),
      tap(err => {
        if (logger) {
          if (isAxiosError(err.error)) {
            err.error = err.error.toJSON();
          }
          if (hasDbLogger(logger)) {
            logger.dbLogger.log("error", "retryStrat error", { err });
          } else {
            logger.log("caught retry... delay", err.error.toString());
          }
        }
      }),
      delay(msdelay)
    )
  );
};

export interface ScheduleContext {
  dbLogger: DBLogger;
}

export const hasDbLogger = (scheduleContext: any): scheduleContext is ScheduleContext => {
  return "dbLogger" in scheduleContext;
};
