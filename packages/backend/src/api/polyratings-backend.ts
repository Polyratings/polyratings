import { Router, Sunder } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { withDefaultHeaders } from '@polyratings/backend/middlewares/with-default-headers';
import { registerRoutes } from '@polyratings/backend/api/routing';
import { polyratingsErrorMiddleware } from '@polyratings/backend/middlewares/polyratings-error-middleware';
import { polyratingsBodyMiddleware } from '@polyratings/backend/middlewares/polyratings-body-middleware';

export function polyratingsBackend() {
    const backend = new Sunder<Env>();
    const router = new Router<Env>();

    // register routes and their handlers
    registerRoutes(router);

    // apply default CORS headers upstream
    backend.use(withDefaultHeaders);

    // error handling
    backend.use(polyratingsErrorMiddleware);

    // automatic data-layer transformation from backend DTOs
    backend.use(polyratingsBodyMiddleware)

    // route the request to proper handler
    backend.use(router.middleware);

    return backend;
}