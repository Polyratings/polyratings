import 'reflect-metadata';
import { polyratingsBackend } from '@polyratings/backend/api/polyratings-backend';
import { Env } from './bindings';
import { CloudflareEventFunctions } from 'sunder/application';

const backend = polyratingsBackend();

export default {
    async fetch(request: Request, env: Env, ctx: CloudflareEventFunctions) {
        return backend.fetch(request, env, ctx);
    }
}