import { AddProfessorRequest, Teacher } from "@polyratings/client";
import { config } from "@/App.config";
import { getRandomSubarray, intersectingDbEntities } from "@/utils";
import { HttpService } from "./http.service";
import { StorageService } from ".";

export const TEACHER_CACHE_TIME = 1000 * 60 * 10;
const ALL_TEACHER_CACHE_KEY = "ALL_TEACHERS";

export type TeacherSearchType = "name" | "department" | "class";

export class TeacherService {
    private allTeachers: Promise<Teacher[]>;

    constructor(private httpService: HttpService, private storageService: StorageService) {
        this.allTeachers = storageService
            .getItem<Teacher[]>(ALL_TEACHER_CACHE_KEY)
            .then(async (result) => {
                if (result) {
                    return result.data;
                }
                const res = await this.httpService.fetch(`${config.remoteUrl}/professors`);
                const data = await res.json();
                await storageService.setItem(ALL_TEACHER_CACHE_KEY, data, TEACHER_CACHE_TIME);
                return data;
            });
    }

    public async getBestTeachers(): Promise<Teacher[]> {
        const allTeachers = await this.allTeachers;
        const rankedTeachers = allTeachers
            .filter((t) => t.numEvals > 10)
            .sort((a, b) => b.overallRating - a.overallRating);
        return getRandomSubarray(rankedTeachers.slice(0, 100), 6);
    }

    public async getTeacher(id: string): Promise<Teacher> {
        const localTeacherCacheEntry = await this.storageService.getItem<Teacher>(id);
        if (localTeacherCacheEntry) {
            return localTeacherCacheEntry.data;
        }

        const res = await this.httpService.fetch(`${config.remoteUrl}/professors/${id}`);

        const teacher: Teacher = await res.json();
        // Make sure reviews are in dated order
        Object.values(teacher.reviews ?? []).forEach((reviewArr) =>
            reviewArr.sort(
                (a, b) => Date.parse(b.postDate.toString()) - Date.parse(a.postDate.toString()),
            ),
        );
        this.addTeacherToCache(teacher);
        return teacher;
    }

    public async searchForTeacher(type: TeacherSearchType, value: string): Promise<Teacher[]> {
        const allTeachers = await this.allTeachers;

        switch (type) {
            case "name": {
                const tokens = value.toLowerCase().split(" ");
                const tokenMatches = tokens.map((token) =>
                    allTeachers.filter((teacher) =>
                        `${teacher.lastName}, ${teacher.firstName}`.toLowerCase().includes(token),
                    ),
                );
                const { intersect, nonIntersect } = intersectingDbEntities(tokenMatches);
                return [...intersect, ...nonIntersect];
            }
            case "class": {
                const courseName = value.toUpperCase();
                // use includes to possibly be more lenient
                return allTeachers.filter((teacher) =>
                    teacher.courses.find((course) => course.includes(courseName)),
                );
            }
            case "department": {
                const department = value.toUpperCase();
                // Use starts with since most times with department you are looking for an exact match
                return allTeachers.filter((teacher) => teacher.department.startsWith(department));
            }
            default:
                throw new Error(`Invalid Search Type: ${type}`);
        }
    }

    public async getAllTeachers(): Promise<Teacher[]> {
        return this.allTeachers;
    }

    public async addNewTeacher(newTeacher: AddProfessorRequest): Promise<void> {
        await this.httpService.fetch(`${config.remoteUrl}/professors`, {
            method: "POST",
            body: JSON.stringify(newTeacher),
        });
    }

    private addTeacherToCache(teacher: Teacher) {
        this.storageService.setItem(teacher.id, teacher, TEACHER_CACHE_TIME);
    }

    public overrideCacheEntry(teacher: Teacher) {
        this.addTeacherToCache(teacher);
    }
}
