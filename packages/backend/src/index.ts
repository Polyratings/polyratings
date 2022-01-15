import { Router } from 'itty-router';
import { ProfessorHandler } from './api/professors/professor-handler';
import { error } from 'itty-router-extras';

const router = Router();

/**
 * /professors endpoints
 */
router.get(
    '/professors',
    async () => await ProfessorHandler.getProfessorList(),
);
router.get(
    '/professors/:id',
    async ({ params }) => await ProfessorHandler.getSingleProfessor(params?.id),
);

/**
 * Miscellaneous endpoints for generic cases
 */
router.all('*', () => error(404, 'Resource not found!'));

addEventListener('fetch', (event) => {
    event.respondWith(router.handle(event.request));
});
