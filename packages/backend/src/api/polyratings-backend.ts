import { Router, Sunder } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { withDefaultHeaders } from '@polyratings/backend/middlewares/with-default-headers';
import { registerRoutes } from '@polyratings/backend/api/routing';
import { renderErrorsAsJSON } from 'sunder/middleware/render';

export function polyratingsBackend() {
    const backend = new Sunder<Env>();
    const router = new Router<Env>();

    // register routes and their handlers
    registerRoutes(router);

    // generic error handling
    backend.use(renderErrorsAsJSON);

    // apply default CORS headers upstream
    backend.use(withDefaultHeaders);

    // route the request to proper handler
    backend.use(router.middleware);

    return backend;
}