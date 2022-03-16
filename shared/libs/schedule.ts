export type CronSchedules = {
    [key: string]: {
        last: Date;
        next: Date;
    };
};
