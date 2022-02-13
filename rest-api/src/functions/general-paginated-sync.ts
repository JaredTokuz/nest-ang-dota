import { Collection, WithId } from 'mongodb';
import { concatMap, from, Observable, Subject, takeUntil, takeWhile, tap, timer } from 'rxjs';
import { Context, ProcessResponse, ProcessTrace } from '../interfaces/process';
import { isNull } from './guards';

export type GeneralPaginatedSyncArgs<T, F> = {
  /** batch size to sync in memory */
  limit: number;
  /** mongo query */
  query: Partial<T>;
  /** timeout in seconds for each batch of records */
  timeout: number;
  /** ctx */
  ctx: Context;
  /** the function that returns obs that is processing */
  processArrayFn$: ({ payload, ctx }: ProcessTrace<WithId<T>[]>) => Observable<ProcessResponse<F, 'success' | 'error'>>;
  /** collection */
  collection: Collection<T>;
};

export const generalPaginatedSync = <T, F>(args: GeneralPaginatedSyncArgs<T, F>) => {
  const subject = new Subject<number>();
  let page = 0;
  paginatedSyncStrategy(subject.asObservable(), args).subscribe({
    next: () => {
      page += 1;
      subject.next(page);
    },
    complete: () => {
      args.ctx.dbLogger.log('log', 'general paginated sync complete');
    }
  });
  subject.next(page);
};

export const paginatedSyncStrategy = <T, F>(
  ob$: Observable<number>,
  { limit, query, timeout, ctx, processArrayFn$, collection }: GeneralPaginatedSyncArgs<T, F>
) => {
  return ob$.pipe(
    concatMap(page => {
      return from(
        collection
          .find(query)
          .skip(page * limit)
          .limit(limit)
          .toArray()
      ).pipe(
        tap(v => v),
        /** We are setting the timeout of the batch job */
        takeUntil(timer(1000 * timeout)),
        /** auto complete when mongo query return null */
        takeWhile(arr_data => !isNull(arr_data)),
        concatMap(arr_data => {
          return processArrayFn$({ payload: arr_data, ctx });
        })
      );
    })
  );
};
