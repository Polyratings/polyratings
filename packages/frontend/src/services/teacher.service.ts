import { TeacherEntry, Teacher, TeacherIdResponse } from "@polyratings-revamp/shared"
import { config } from "../App.config";
import { HttpService } from "./http.service";

export class TeacherService {
    constructor(
        private httpService:HttpService
    ){}

    async getRandomBestTeacher(): Promise<TeacherEntry> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/best`)
        this.throwIfNot200(res)
        return res.json()
    }

    async getRandomWorstTeachers(): Promise<TeacherEntry[]> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/worst`)
        this.throwIfNot200(res)
        return res.json()
    }

    async getTeacher(id:string): Promise<TeacherEntry> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/${id}`)
        this.throwIfNot200(res)
        return res.json()
    }

    async searchForTeacher(value:string): Promise<TeacherEntry[]> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/search/${encodeURIComponent(value)}`)
        this.throwIfNot200(res)
        return res.json()
    }

    async getAllTeachers(): Promise<TeacherEntry[]> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/teacher/all`)
        this.throwIfNot200(res)
        return res.json()
    }

    async addNewTeacher(newTeacher:Teacher): Promise<number> {
        const res = await this.httpService.fetch(
            `${config.remoteUrl}/teacher`,
            {
                method:'POST',
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify(newTeacher)
            }
        )
        const teacherIdResponse = await res.json() as TeacherIdResponse
        return teacherIdResponse.teacherId
    }
   
    private throwIfNot200(res:Response) {
        if(res.status != 200) {
            throw res.statusText
        }
    }
}