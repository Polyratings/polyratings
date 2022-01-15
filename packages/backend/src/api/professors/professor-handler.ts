import { missing, error } from 'itty-router-extras';
import { setCorsHeaders } from '../../utils';

export class ProfessorHandler {
    /**
     * Retrieves a single professor and his/her rating information from the
     * KV store
     *
     * @param id
     *  id of the professor being retrieved
     */
    static async getSingleProfessor(id?: string): Promise<Response> {
        // prevent querying null professors
        if (id == null || id === '') {
            return error(400, 'Invalid professor id!');
        }

        // prevent users from utilizing this endpoint to get the professors list
        // this is mostly a no-op, but this guarantees us more accurate usage statistics
        if (id === 'all') {
            return missing('Could not find professor!');
        }

        const professor = await POLYRATINGS.get(id);
        if (professor === null) {
            return missing('Could not find professor!');
        }

        const headers = setCorsHeaders(new Headers());
        headers.set('Content-Type', 'application/json; charset=UTF-8');
        headers.set('Content-Encoding', 'gzip');
        headers.set('Vary', 'Accept-Encoding');

        return new Response(professor, {
            status: 200,
            headers: headers,
        });
    }

    /**
     * Retrieves the entire list of professors in the KV Store
     */
    static async getProfessorList(): Promise<Response> {
        const professorList = await POLYRATINGS.get('all');
        if (professorList === null) {
            return error(404, 'No professors exist!');
        }

        const headers = setCorsHeaders(new Headers());
        headers.set('Content-Type', 'application/json; charset=UTF-8');
        headers.set('Content-Encoding', 'gzip');
        headers.set('Vary', 'Accept-Encoding');

        return new Response(professorList, {
            status: 200,
            headers: headers,
        });
    }
}
