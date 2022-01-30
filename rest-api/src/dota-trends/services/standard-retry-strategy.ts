import { AxiosResponse } from "axios";
import { delayWhen, map, Observable, retryWhen, take, tap, timer } from "rxjs";

export const standardRetryStrategy = <T>(obs: Observable<AxiosResponse<T>>): Observable<T> => {
  return obs.pipe(
    map(resp => resp.data as T),
    retryWhen(errors =>
      errors.pipe(
        tap(val => console.log("starting delay on", val)),
        delayWhen(() => timer(2000)),
        take(3)
      )
    )
  );
};
