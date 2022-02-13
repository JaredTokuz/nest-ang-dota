import { DbLogger } from './db-logger';

export type Context = {
  dbLogger: DbLogger;
};

export const isContext = (context: any): context is Context => {
  return 'dbLogger' in context;
};

/** Object that goes into and requests repo job */
export type ProcessTrace<T> = {
  payload: T;
  ctx: Context;
};

export type ProcessResponseStatus = 'success' | 'error';

/** end response coming out of repo */
export type ProcessResponse<T, status extends ProcessResponseStatus> = {
  status: status;
  payload: T;
  ctx: Context;
};

export type ErrorPayload<T> = {
  input: T /** should be ProcessTrace.payload */;
  string: string;
  msg: string;
  err?: any;
};
export type TypeProcessResponseError<T> = ProcessResponse<ErrorPayload<T>, 'error'>;
export type TypeProcessResponseSuccess<T> = ProcessResponse<T, 'success'>;

export const SuccessProcessResponse = <T>(payload: T, ctx: Context): TypeProcessResponseSuccess<T> => {
  return { status: 'success', payload, ctx };
};

export const ErrorProcessResponse = <T>(payload: ErrorPayload<T>, ctx: Context): TypeProcessResponseError<T> => {
  return { status: 'error', payload, ctx };
};

export type ProcessTypes<T> = TypeProcessResponseError<T> | TypeProcessResponseSuccess<T>;
export const isSuccessResp = <T>(res: ProcessTypes<T>): res is TypeProcessResponseSuccess<T> => {
  return res.status == 'success';
};
export const isErrResp = <T>(res: ProcessTypes<T>): res is TypeProcessResponseError<T> => {
  return res.status == 'error';
};

export type ErrorObj = {
  /** manual or 3rd party error */
  err: Error;
  /** our msg string for the logg if the error was 3rd party */
  msg?: string;
};

export const errorObj = ({ err, msg }: ErrorObj): ErrorObj => {
  return { err, msg };
};
