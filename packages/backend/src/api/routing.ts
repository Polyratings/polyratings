import { Router } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ProfessorHandler } from '@polyratings/backend/api/professors/professor-handler';
import { withValidatedBody } from '@polyratings/backend/middlewares/with-validated-body';
import { AddReviewRequest, LoginRequest } from '@polyratings/shared';
import { RatingHandler } from '@polyratings/backend/api/ratings/rating-handler';
import { withMiddlewares } from '@polyratings/backend/middlewares/with-middlewares';
import { AuthHandler } from './auth/auth-handler';
import { withAuth } from '../middlewares/auth-middleware';
import { AdminHandler } from './admin/admin-handler';

export function registerRoutes(router: Router<Env>) {
    router.get('/professors', ProfessorHandler.getProfessorList);

    router.get('/professors/:id', ProfessorHandler.getSingleProfessor);

    router.post(
        '/professors/:id/ratings',
        withMiddlewares(
            withValidatedBody(AddReviewRequest),
            RatingHandler.addNewRating,
        ),
    );
    router.get('/ratings/:id', RatingHandler.processRating);

    router.post(
        '/login',
        withMiddlewares(withValidatedBody(LoginRequest), AuthHandler.login),
    );

    router.post(
        '/register/:secret',
        withMiddlewares(withValidatedBody(LoginRequest), AuthHandler.register),
    );

    router.delete(
        '/admin/rating',
        withMiddlewares(
            withValidatedBody(LoginRequest, true),
            withAuth,
            AdminHandler.removeRating,
        ),
    );

    // no-op catch-all (which also applies generic OPTIONS headers)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    router.options('*', () => {});

    router.all('*', (ctx) => {
        ctx.response.status = 404;
        ctx.response.statusText = 'Route not found!';
    });
}
