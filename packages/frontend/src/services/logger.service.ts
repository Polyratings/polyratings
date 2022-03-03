/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable class-methods-use-this */
import * as Sentry from "@sentry/react";

export class Logger {
    info(...args: any[]) {
        console.log(...args);
    }

    warn(...args: any[]) {
        console.warn(...args);
    }

    error(...args: any[]) {
        args.forEach((arg) => {
            if (arg instanceof Error) {
                Sentry.captureException(arg);
            }
        });
        console.error(...args);
    }

    debug(...args: any[]) {
        console.debug(...args);
    }
}
