import { Router } from 'sunder';
import { Env } from '@polyratings/backend/bindings';
import { ProfessorHandler } from '@polyratings/backend/api/professors/professor-handler';
import { withValidatedBody } from '@polyratings/backend/middlewares/with-validated-body';
import { AddReviewRequest } from '@polyratings/shared';
import { RatingHandler } from '@polyratings/backend/api/ratings/rating-handler';
import { withMiddlewares } from '@polyratings/backend/middlewares/with-middlewares';

export function registerRoutes(router: Router<Env>) {
    router.get('/professors', ProfessorHandler.getProfessorList);

    router.get('/professors/:id', ProfessorHandler.getSingleProfessor);

    router.post("/professors/:id/ratings", withMiddlewares(
        withValidatedBody(AddReviewRequest),
        RatingHandler.addNewRating
    ));

    // no-op catch-all (which also applies generic OPTIONS headers)
    router.options('*', () => {});

    router.all('*', (ctx => {
        ctx.response.status = 404;
        ctx.response.statusText = 'Route not found!'
    }));
}