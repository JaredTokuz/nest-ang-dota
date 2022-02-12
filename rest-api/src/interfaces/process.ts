import { DbLogger } from './db-logger';

export type Context = {
	dbLogger: DbLogger;
};

export const isContext = (context: any): context is Context => {
	return 'dbLogger' in context;
};

export type ProcessTrace<T> = {
	payload: T;
	ctx: Context;
};

export type ProcessResponseStatus = 'success' | 'error';

export type ProcessResponse<T> = {
	status: ProcessResponseStatus;
	payload: T;
	ctx?: Context;
};

export const ProcessResponse = <T>(
	status: ProcessResponseStatus,
	payload: T,
	ctx?: Context
): ProcessResponse<T> => {
	return { status, payload, ctx };
};

export type ErrorObj = {
	err: Error;
	/** msg string for the logg */
	msg: string;
};

export const errorObj = ({ err, msg }: ErrorObj): ErrorObj => {
	return { err, msg };
};
