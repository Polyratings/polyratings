import 'reflect-metadata';
import { polyratingsBackend } from '@polyratings/backend/api/polyratings-backend';
import { CloudflareEventFunctions } from 'sunder/application';
import { CloudflareEnv, Env } from '@polyratings/backend/bindings';

const backend = polyratingsBackend();

export default {
    async fetch(
        request: Request,
        env: CloudflareEnv,
        ctx: CloudflareEventFunctions,
    ) {
        return backend.fetch(request, new Env(env), ctx);
    },
};
