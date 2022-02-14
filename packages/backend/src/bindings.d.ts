import { KVDAO } from '@polyratings/backend/dao/kv-dao';
import { CloudflareEnv } from '@polyratings/backend/index';
import { PerspectiveDAO } from '@polyratings/backend/dao/perspective-dao';
import { AuthStrategy } from '@polyratings/backend/api/auth/auth-strategy';

export class Env {
    kvDao: KVDAO;
    perspectiveDao: PerspectiveDAO;
    authStrategy: AuthStrategy;

    constructor(private env: CloudflareEnv) {
        this.kvDao = new KVDAO(
            env.POLYRATINGS,
            env.POLYRATINGS_USERS,
            env.PROCESSING_QUEUE,
            env.POLYRATINGS_TEACHER_APPROVAL_QUEUE,
        );
        this.perspectiveDao = new PerspectiveDAO(env.PERSPECTIVE_API_KEY);
        this.authStrategy = new AuthStrategy(env.JWT_SIGNING_KEY);
    }
}

export interface CloudflareEnv {
    POLYRATINGS: KVNamespace;
    PROCESSING_QUEUE: KVNamespace;
    POLYRATINGS_USERS: KVNamespace;
    POLYRATINGS_TEACHER_APPROVAL_QUEUE: KVNamespace;
    JWT_SIGNING_KEY: string;
    PERSPECTIVE_API_KEY: string;
}
