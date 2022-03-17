import type { PolyratingsBackendRouting } from "@polyratings/backend";
import {
    AdminModule,
    AuthModule,
    ErrorInterceptor,
    HttpModule,
    ProfessorModule,
    RatingModule,
} from "./modules";

export class Client {
    public professors: ProfessorModule;

    public auth: AuthModule;

    public ratings: RatingModule;

    public admin: AdminModule;

    constructor(env: PolyratingsAPIEnv, errorInterceptor?: ErrorInterceptor) {
        const httpModule = new HttpModule(env.url, errorInterceptor ?? (() => {}));
        this.professors = new ProfessorModule(httpModule);
        this.auth = new AuthModule(httpModule);
        this.ratings = new RatingModule(httpModule);
        this.admin = new AdminModule(httpModule);
    }

    /**
     * Used for type checking url routing. Not an actually useful function
     * @deprecated
     */
    typeCheck(): PolyratingsBackendRouting {
        const routes: PolyratingsBackendRouting = {
            "get:/professors": this.professors.all,
            "get:/professors/:id": this.professors.get,
            "post:/professors": this.professors.new,
            "post:/login": this.auth.login,
            "post:/register": this.auth.register,
            "post:/professors/ratings": this.ratings.initiateAdd,
            "post:/rating/report": this.ratings.report,
            "get:/ratings/:id": this.ratings.finishAdd,
            "get:/admin/bulk/:key": this.admin.bulkKvKeys,
            "post:/admin/bulk/:key": this.admin.bulkKvValues,
            "get:/admin/professors/pending": this.admin.pendingProfessors,
            "delete:/admin/pending/:id": this.admin.removePendingProfessor,
            "post:/admin/pending/:id": this.admin.approvePendingProfessor,
            "delete:/admin/reports/:id": this.admin.removeReport,
            "post:/admin/reports/:id": this.admin.approveReport,
            "delete:/admin/rating/:professorId/:reviewId": this.admin.removeRating,
            "delete:/admin/professor/:id": this.admin.deleteProfessor,
            "post:/admin/professor/merge": this.admin.mergeProfessor,
            "post:/admin/professor/department": this.admin.changeProfessorDepartment,
        };
        return routes;
    }
}

export interface PolyratingsAPIEnv {
    url: string;
}

export const PROD_ENV: PolyratingsAPIEnv = {
    url: "https://api-prod.polyratings.dev",
};

export const BETA_ENV: PolyratingsAPIEnv = {
    url: "https://api-beta.polyratings.dev",
};

export const DEV_ENV: PolyratingsAPIEnv = {
    url: "https://api-dev.polyratings.dev",
};
