import { LoggerService } from '@nestjs/common';
import { catchError, Observable, of, tap } from 'rxjs';
import { ErrorObj, ProcessResponse } from '../interfaces/process';

export const catchErrorStrategy = <T>(res: ProcessResponse<T>, logger?: LoggerService) => {
	return catchError<ProcessResponse<T>, Observable<ProcessResponse<T>>>(({ err, msg }: ErrorObj) => {
		if (logger) logger.error(`catchError ${err.toString()}`);
		return of(res).pipe(
			/** not sure if this should be moved outside to a manager role */
			tap((res) => {
				res.ctx.dbLogger.log('error', msg || 'msg not passed', {
					err: err.toString(),
					payload: res.payload
				});
			})
		);
	});
};
