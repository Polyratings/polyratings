import { TeacherEntry, Teacher, TeacherIdResponse } from "@polyratings-revamp/shared"
import { config } from "../App.config";
import { getRandomSubarray, intersectingDbEntities } from "../utils";
import { HttpService } from "./http.service";

export class TeacherService {

    public allTeachers:Promise<TeacherEntry[]>

    constructor(
        private httpService:HttpService
    ){
        this.allTeachers = new Promise(async resolve => {
            const res = await this.httpService.fetch(`${config.remoteUrl}/all`)
            this.throwIfNot200(res)
            const data = await res.json()
            resolve(data)
        })
    }

    async getRandomBestTeacher(): Promise<TeacherEntry> {
        const allTeachers = await this.allTeachers
        const rankedTeachers = allTeachers
            .filter(t => t.numEvals > 10)
            .sort((a,b) => parseFloat(b.avgRating) - parseFloat(a.avgRating))
        return getRandomSubarray(rankedTeachers.slice(0,30), 1)[0]
    }

    async getRandomWorstTeachers(): Promise<TeacherEntry[]> {
        const allTeachers = await this.allTeachers
        const rankedTeachers = allTeachers
            .filter(t => t.numEvals > 10)
            .sort((a,b) => parseFloat(a.avgRating) - parseFloat(b.avgRating))
        return getRandomSubarray(rankedTeachers.slice(0,30), 6)
    }

    async getTeacher(id:string): Promise<TeacherEntry> {
        const res = await this.httpService.fetch(`${config.remoteUrl}/${id}`)
        this.throwIfNot200(res)
        return res.json()
    }

    async searchForTeacher(value:string): Promise<TeacherEntry[]> {
        const allTeachers = await this.allTeachers
        const tokens = value.toLowerCase().split(' ')
        const tokenMatches = tokens
            .map(token => allTeachers.filter(teacher => `${teacher.lastName}, ${teacher.firstName}`.toLowerCase().includes(token)))
        const {intersect, nonIntersect} = intersectingDbEntities(tokenMatches)
        return [...intersect, ...nonIntersect]
    }

    async getAllTeachers(): Promise<TeacherEntry[]> {
        return this.allTeachers
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