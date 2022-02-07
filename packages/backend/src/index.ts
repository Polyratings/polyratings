import 'reflect-metadata';
import { polyratingsBackend } from '@polyratings/backend/api/polyratings-backend';
import { CloudflareEnv, Env } from './bindings';
import { CloudflareEventFunctions } from 'sunder/application';

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
