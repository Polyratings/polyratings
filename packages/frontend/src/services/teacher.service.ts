import { Teacher, TeacherIdResponse } from '@polyratings/shared';
import { config } from '@/App.config';
import { getRandomSubarray, intersectingDbEntities } from '@/utils';
import { HttpService } from './http.service';

export const TEACHER_CACHE_TIME = 1000 * 60 * 10;
const ALL_TEACHER_CACHE_KEY = 'ALL_TEACHERS';
const INDIVIDUAL_TEACHER_CACHE_KEY = 'TEACHERS';

interface TeacherCacheEntry {
  exp: number;
  teacher: Teacher;
}

export type TeacherSearchType = 'name' | 'department' | 'class';

export class TeacherService {
  private allTeachers: Promise<Teacher[]>;

  private teacherCache: { [id: string]: TeacherCacheEntry };

  constructor(private httpService: HttpService, private storage: Storage) {
    const individualTeacherCacheStr = this.storage.getItem(INDIVIDUAL_TEACHER_CACHE_KEY);
    this.teacherCache = individualTeacherCacheStr ? JSON.parse(individualTeacherCacheStr) : {};

    const cachedAllTeacherCacheStr = this.storage.getItem(ALL_TEACHER_CACHE_KEY);
    if (cachedAllTeacherCacheStr) {
      const allTeacherCache: { exp: number; data: Teacher[] } =
        JSON.parse(cachedAllTeacherCacheStr);
      if (Date.now() < allTeacherCache.exp) {
        // List has not expired
        this.allTeachers = Promise.resolve(allTeacherCache.data);
        // Return early no need to fetch the teacher list
        return;
      }
    }

    this.allTeachers = (async () => {
      const res = await this.httpService.fetch(`${config.remoteUrl}/professors`);
      const data = await res.json();
      this.storage.setItem(
        ALL_TEACHER_CACHE_KEY,
        JSON.stringify({
          exp: Date.now() + TEACHER_CACHE_TIME,
          data,
        }),
      );
      return data;
    })();
  }

  public async getRandomBestTeacher(): Promise<Teacher> {
    const allTeachers = await this.allTeachers;
    const rankedTeachers = allTeachers
      .filter((t) => t.numEvals > 10)
      .sort((a, b) => b.overallRating - a.overallRating);
    return getRandomSubarray(rankedTeachers.slice(0, 30), 1)[0];
  }

  public async getRandomWorstTeachers(): Promise<Teacher[]> {
    const allTeachers = await this.allTeachers;
    const rankedTeachers = allTeachers
      .filter((t) => t.numEvals > 10)
      .sort((a, b) => a.overallRating - b.overallRating);
    return getRandomSubarray(rankedTeachers.slice(0, 30), 6);
  }

  public async getTeacher(id: string): Promise<Teacher> {
    if (this.teacherCache[id]) {
      if (Date.now() < this.teacherCache[id].exp) {
        return this.teacherCache[id].teacher;
      }
      this.removeTeacherFromCache(id);
    }

    const res = await this.httpService.fetch(`${config.remoteUrl}/professors/${id}`);

    const teacher: Teacher = await res.json();
    // Make sure reviews are in dated order
    Object.values(teacher.reviews ?? []).forEach((reviewArr) =>
      reviewArr.sort((a, b) => Date.parse(b.postDate.toString()) - Date.parse(a.postDate.toString())),
    );
    this.addTeacherToCache(teacher);
    return teacher;
  }

  public async searchForTeacher(type: TeacherSearchType, value: string): Promise<Teacher[]> {
    const allTeachers = await this.allTeachers;

    switch (type) {
      case 'name': {
        const tokens = value.toLowerCase().split(' ');
        const tokenMatches = tokens.map((token) =>
          allTeachers.filter((teacher) =>
            `${teacher.lastName}, ${teacher.firstName}`.toLowerCase().includes(token),
          ),
        );
        const { intersect, nonIntersect } = intersectingDbEntities(tokenMatches);
        return [...intersect, ...nonIntersect];
      }
      case 'class': {
        const courseName = value.toUpperCase();
        // use includes to possibly be more lenient
        return allTeachers.filter((teacher) =>
          teacher.courses.find((course) => course.includes(courseName)),
        );
      }
      case 'department': {
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

  public async addNewTeacher(newTeacher: Teacher): Promise<number> {
    const res = await this.httpService.fetch(`${config.remoteUrl}/teacher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTeacher),
    });
    const teacherIdResponse = (await res.json()) as TeacherIdResponse;
    return teacherIdResponse.teacherId;
  }

  private addTeacherToCache(teacher: Teacher) {
    this.teacherCache[teacher.id] = {
      teacher,
      exp: Date.now() + TEACHER_CACHE_TIME,
    };
    this.storage.setItem(INDIVIDUAL_TEACHER_CACHE_KEY, JSON.stringify(this.teacherCache));
  }

  private removeTeacherFromCache(id: string) {
    delete this.teacherCache[id];
    this.storage.setItem(INDIVIDUAL_TEACHER_CACHE_KEY, JSON.stringify(this.teacherCache));
  }
}
