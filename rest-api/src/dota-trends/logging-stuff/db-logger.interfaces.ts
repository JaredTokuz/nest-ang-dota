/**
 * verbose = line log describing the process
 * info = contains a payload of valueable data to be used somewhere
 * error = errors or warnings of something caught, handled, thrown
 */
export type LogType = "debug" | "info" | "error";

/** format: {dateTime}-{gen-random-id};
 } */
export type LoggerRunId = string;

export interface SharedFields {
  createdAt: Date;
  runId: LoggerRunId;
  seqNo: number;
  message: string;
  type: LogType;
  /** difference in milliseconds since the last log */
  diffMS: number;
}

export interface InputLogRequiredFields {
  message: string;
  type: LogType;
}
