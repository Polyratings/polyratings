import { Teacher } from "../models/Teacher";
import { config } from "../App.config";
import { HttpService } from "./http.service";


export class TeacherService {
    constructor(
        private httpService:HttpService
    ){}

    async getRandomBestTeacher(): Promise<Teacher> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/best`)
        this.throwIfNot200(res)
        return res.json()
    }

    async getRandomWorstTeachers(): Promise<Teacher[]> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/worst`)
        this.throwIfNot200(res)
        return res.json()
    }

    async getTeacher(id:string): Promise<Teacher> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/${id}`)
        this.throwIfNot200(res)
        return res.json()
    }

    async searchForTeacher(value:string): Promise<Teacher[]> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/search/${encodeURIComponent(value)}`)
        this.throwIfNot200(res)
        return res.json()
    }

    async getAllTeachers(): Promise<Teacher[]> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/all`)
        this.throwIfNot200(res)
        return res.json()
    }
   
    private throwIfNot200(res:Response) {
        if(res.status != 200) {
            throw res.statusText
        }
    }
}