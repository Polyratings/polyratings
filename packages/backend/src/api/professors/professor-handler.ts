import { missing, error } from 'itty-router-extras';
import { Request } from 'itty-router';
import { polytatingsResponse } from '../../utils';

export class ProfessorHandler {
    /**
     * Retrieves a single professor and his/her rating information from the
     * KV store
     *
     * @param id
     *  id of the professor being retrieved
     */
    static async getSingleProfessor(req:Request): Promise<Response> {
        const id = req.params?.id
        // prevent querying null professors
        if (id == null || id === '') {
            return error(400, 'Invalid professor id!');
        }

        const professor = await POLYRATINGS.get(id);
        if (professor === null) {
            return missing('Could not find professor!');
        }

        return polytatingsResponse(professor);
    }

    /**
     * Retrieves the entire list of professors in the KV Store
     */
    static async getProfessorList(): Promise<Response> {
        const professorList = await POLYRATINGS.get('all');
        if (professorList === null) {
            return error(404, 'No professors exist!');
        }

        return polytatingsResponse(professorList)
    }
}
