import { errorObj } from './../interfaces/process';
import { isNull } from './guards';
import { concatMap } from 'rxjs';
import { Collection, WithId } from 'mongodb';
import { from, Observable } from 'rxjs';
import { Context, ProcessResponse, ProcessTrace } from '../interfaces/process';

export type DbCheckFirstArgs<T, F> = {
  /** mongo query */
  query: Partial<T>;
  /** the obs that is processing */
  ifDbFindOb$: Observable<F>;
  /** collection */
  collection: Collection<T>;
  /** throw based on the flag default = true, false = throw when record is found */
  ifNotFoundThrow: boolean;
};

export const dbCheckFirst = <T, F>({ ifDbFindOb$, collection, query, ifNotFoundThrow }: DbCheckFirstArgs<T, F>) => {
  return from(collection.findOne(query)).pipe(
    concatMap(doc => {
      if (isNull(doc) == ifNotFoundThrow) {
        const err_msg = ifNotFoundThrow ? 'record not found' : 'record found';
        throw errorObj({ err: new Error(err_msg) });
      } else {
        return ifDbFindOb$;
      }
    })
  );
};
