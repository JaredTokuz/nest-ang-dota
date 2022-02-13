import { ProcessTrace, TypeProcessResponseSuccess } from './../interfaces/process';
import { LoggerService } from '@nestjs/common';
import { catchError, Observable, of, tap } from 'rxjs';
import { ErrorObj, TypeProcessResponseError } from '../interfaces/process';
import { ErrorProcessResponse } from './../interfaces/process';

export const catchErrorStandard = <T, E>(res: ProcessTrace<E>) => {
  return catchError<
    TypeProcessResponseSuccess<T>,
    Observable<TypeProcessResponseSuccess<T> | TypeProcessResponseError<E>>
  >(({ err, msg }: ErrorObj) => {
    const errorResp = ErrorProcessResponse({ input: res.payload, msg: msg, string: err.toString() }, res.ctx);
    return of(errorResp).pipe(
      /** not sure if this should be moved outside to a manager role */
      tap(res => {
        res.ctx.dbLogger.log('error', msg, {
          err: err.toString(),
          payload: res.payload
        });
      })
    );
  });
};

export const standardCatchErrorStrategy = <T, E>({
  ob$,
  pt
}: {
  ob$: Observable<TypeProcessResponseSuccess<T>>;
  pt: ProcessTrace<E>;
}) => {
  return ob$.pipe(catchErrorStandard(pt));
};

// export const catchErrorDbLog = <T, E>(res: TypeProcessResponseError<E>) => {
//     return catchError<
//       TypeProcessResponseSuccess<T>,
//       Observable<TypeProcessResponseSuccess<T> | TypeProcessResponseError<E>>
//     >(({ err, msg }: ErrorObj) => {
//       return of(res).pipe(
//         /** not sure if this should be moved outside to a manager role */
//         tap(res => {
//           res.ctx.dbLogger.log('error', msg || 'msg not passed', {
//             err: err.toString(),
//             payload: res.payload
//           });
//         })
//       );
//     });
//   };

//   export const catchErrorStrategy = <T, E>({
//     ob$,
//     errorResp
//   }: {
//     ob$: Observable<TypeProcessResponseSuccess<T>>;
//     errorResp: TypeProcessResponseError<E>;
//   }) => {
//     return ob$.pipe(catchErrorDbLog(errorResp));
//   };
