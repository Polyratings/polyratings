import { polyratingsBackend } from '@polyratings/backend/api/polyratings-backend';

const backend = polyratingsBackend();

export default {
    async fetch(request: Request, env: any, ctx: any) {
        return backend.fetch(request, env, ctx);
    }
}