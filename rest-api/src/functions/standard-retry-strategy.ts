import { Logger, LoggerService } from '@nestjs/common';
import { AxiosResponse, AxiosError } from 'axios';
import { delay, delayWhen, map, Observable, retryWhen, scan, take, tap, timer } from 'rxjs';
import { Context, errorObj, isContext } from '../interfaces/process';
import { DBLogger } from '../classes/db-logger';
import { inspect } from 'util';

/**
 * For Axios library specifically
 * @param obs
 * @param opts
 * @returns
 */
export const standardRetryStrategy = <T>(obs: Observable<AxiosResponse<T>>, opts: RetryOpts): Observable<T> => {
  return obs.pipe(
    map(resp => resp.data as T),
    retryStrat(opts)
  );
};

export const isAxiosError = (obj: any): obj is AxiosError => {
  return 'isAxiosError' in obj;
};

export const minutesInMS = (minutes: number) => minutes * 60 * 1000;

export type RetryOpts = {
  logger?: LoggerService | Context;
  msdelay?: number;
  retries?: number;
};

export const retryStrat = <T>(
  { logger, msdelay, retries }: RetryOpts = {
    msdelay: 0,
    retries: 0
  }
) => {
  return retryWhen<T>((error: Observable<AxiosError>) =>
    error.pipe(
      scan((acc, error) => ({ count: acc.count + 1, error }), {
        count: 0,
        error: undefined
      }),
      map(current => {
        /** 2=retry twice */
        if (isAxiosError(current.error)) {
          if ([400, 401, 404].includes(current.error.response.status)) {
            throw errorObj({ err: current.error, msg: 'bad client request' });
          }
        }
        if (current.count > retries) {
          throw errorObj({ err: current.error, msg: 'retryStrat error, all retries failed' });
        }
        return current;
      }),
      tap(err => {
        const error = err.error;
        if (isAxiosError(error)) {
          if (logger && isContext(logger)) {
            logger.dbLogger.log('error', 'retryStrat error', { err: error.toJSON() });
          } else {
            Logger.log(`caught retry... delay
              name: ${error.name},
              message : ${error.message},
              response: ${inspect(error.response, { showHidden: false, depth: 1, colors: true })}
            `);
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
  return 'dbLogger' in scheduleContext;
};
