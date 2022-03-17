import { AddProfessorRequest, Teacher } from "@polyratings/shared";
import { HttpModule } from ".";

export class ProfessorModule {
    constructor(private httpModule: HttpModule) {}

    /**
     * Returns a list of all of the professors on polyratings without any ratings.
     */
    async all(): Promise<Teacher[]> {
        const res = await this.httpModule.fetch("/professors");
        return res.json();
    }

    /**
     * Returns a professor of a given id with all of their ratings.
     */
    async get(id: string): Promise<Teacher> {
        const res = await this.httpModule.fetch(`/professors/${id}`);
        return res.json();
    }

    /**
     * Adds a new professor to the polyratings database. Needs manual approval before appearing on the live website.
     */
    async new(professor: AddProfessorRequest): Promise<void> {
        await this.httpModule.fetch("/professors", {
            method: "POST",
            body: JSON.stringify(professor),
        });
    }
}
