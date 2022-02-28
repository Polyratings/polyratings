/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class Logger {
    static info(...args: any[]) {
        console.info(...args);
    }

    static warn(...args: any[]) {
        console.warn(...args);
    }

    // TODO: Add remote logging capabilities
    static error(...args: any[]) {
        console.error(...args);
    }

    static debug(...args: any[]) {
        console.debug(...args);
    }
}
