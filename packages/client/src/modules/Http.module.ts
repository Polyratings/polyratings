import { PolyratingsError } from "@polyratings/shared";

export class HttpModule {
    private token: string;

    constructor(private url: string, public errorInterceptor: ErrorInterceptor) {}

    async fetch(route: string, init: RequestInit = {}): Promise<Response> {
        init.headers = init.headers || {};
        if (this.token) {
            // @ts-expect-error error since can't normally index header object. The way that its going to be used will be fine though
            init.headers.Authorization = `Bearer ${this.token}`;
        }
        const res = await globalThis.fetch(`${this.url}${route}`, init);
        if (res.status >= 300) {
            const errorPayload = (await res.json()) as PolyratingsError;
            const error = new PolyratingsHttpError(errorPayload.message, res.status);
            this.errorInterceptor(error);
            throw error;
        }
        return res;
    }

    setAuthToken(jwt: string) {
        this.token = jwt;
    }

    getAuthToken(): string {
        return this.token;
    }
}

export class PolyratingsHttpError extends Error {
    constructor(message: string, public httpStatus: number) {
        super(message);
    }
}

export type ErrorInterceptor = (error: PolyratingsHttpError) => void;
