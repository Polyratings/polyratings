import { TeacherEntry, Teacher, TeacherIdResponse } from "@polyratings/shared"
import { config } from "../App.config";
import { getRandomSubarray, intersectingDbEntities } from "../utils";
import { HttpService } from "./http.service";

const TEN_MINUTES = 1000 * 60 * 10
const ALL_TEACHER_CACHE_KEY = 'ALL_TEACHERS'
const INDIVIDUAL_TEACHER_CACHE_KEY = 'TEACHERS'

interface TeacherCacheEntry {
    exp:Date
    teacher:TeacherEntry
}

export class TeacherService {

    private allTeachers:Promise<TeacherEntry[]>
    private teacherCache:{[id:string]:TeacherCacheEntry}

    constructor(
        private httpService:HttpService,
        private storage:Storage,
    ){

        const individualTeacherCacheStr = this.storage.getItem(INDIVIDUAL_TEACHER_CACHE_KEY)
        this.teacherCache =  individualTeacherCacheStr ? JSON.parse(individualTeacherCacheStr) : {}

        const cachedAllTeacherCacheStr = this.storage.getItem(ALL_TEACHER_CACHE_KEY)
        if(cachedAllTeacherCacheStr) {
            const allTeacherCache:{exp:Date, data:TeacherEntry[]} = JSON.parse(cachedAllTeacherCacheStr)
            if(allTeacherCache.exp < new Date()) {
                // List has not expired
                this.allTeachers = Promise.resolve(allTeacherCache.data)
                // Return early no need to fetch the teacher list
                return
            }
        }

        this.allTeachers = new Promise(async resolve => {
            const res = await this.httpService.fetch(`${config.remoteUrl}/all`)
            this.throwIfNot200(res)
            const data = await res.json()
            this.storage.setItem(ALL_TEACHER_CACHE_KEY, JSON.stringify({
                exp:new Date(Date.now() + TEN_MINUTES),
                data
            }))
            resolve(data)
        })
    }

    async getRandomBestTeacher(): Promise<TeacherEntry> {
        const allTeachers = await this.allTeachers
        const rankedTeachers = allTeachers
            .filter(t => t.numEvals > 10)
            .sort((a,b) => b.overallRating - a.overallRating)
        return getRandomSubarray(rankedTeachers.slice(0,30), 1)[0]
    }

    async getRandomWorstTeachers(): Promise<TeacherEntry[]> {
        const allTeachers = await this.allTeachers
        const rankedTeachers = allTeachers
            .filter(t => t.numEvals > 10)
            .sort((a,b) => a.overallRating - b.overallRating)
        return getRandomSubarray(rankedTeachers.slice(0,30), 6)
    }

    async getTeacher(id:string): Promise<TeacherEntry> {
        if(this.teacherCache[id]) {
            if(this.teacherCache[id].exp > new Date()) {
                return this.teacherCache[id].teacher
            }
            this.removeTeacherFromCache(id)
        }

        const res = await this.httpService.fetch(`${config.remoteUrl}/${id}`)
        this.throwIfNot200(res)

        const teacher:TeacherEntry = await res.json()
        this.addTeacherToCache(teacher)
        return teacher
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

    private addTeacherToCache(teacher:TeacherEntry) {
        this.teacherCache[teacher.id] = {
            teacher,
            exp: new Date(Date.now() + TEN_MINUTES)
        }
        this.storage.setItem(INDIVIDUAL_TEACHER_CACHE_KEY, JSON.stringify(this.teacherCache))
    }

    private removeTeacherFromCache(id:string) {
        delete this.teacherCache[id]
        this.storage.setItem(INDIVIDUAL_TEACHER_CACHE_KEY, JSON.stringify(this.teacherCache))
    }
}