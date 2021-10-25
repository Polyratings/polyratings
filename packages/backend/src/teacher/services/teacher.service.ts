import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { Teacher } from 'src/models/dtos/teacher.dto';
import { ILike, MoreThan, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';

@Injectable()
export class TeacherService {
    constructor(
        @InjectRepository(TeacherEntity)
        private readonly teacherRepository: Repository<TeacherEntity>
    ){}
    
    createTeacher(teacher:Teacher): Promise<TeacherEntity | undefined> {
        return this.teacherRepository.save(teacher)
    }

    async getTeacherByName(name:string = ''): Promise<Teacher[]> {
        const ONE_DAY = 86_400_000; 
        const tokenMatches =  await Promise.all(
            name
            .split(' ')
            .map(token => this.teacherRepository.find({
                where:{
                    name:ILike(`%${token}%`)
                },
                cache: ONE_DAY
            }))
        )
        const { intersect, nonIntersect } = this.intersect(tokenMatches)
        return [...intersect, ...nonIntersect].map(entity => plainToClass(Teacher, entity))
    }

    async getTeacherById(id:string): Promise<Teacher | undefined> {
        const result = await this.teacherRepository.findOne(id, {relations:['classes', 'classes.reviews']})
        if(result) {
            return plainToClass(Teacher, result)
        }
    }

    async getWorstOrBest(best:boolean) : Promise<Teacher[]> {
        const ONE_DAY = 86_400_000; 
        const result = await this.teacherRepository.find({
            order: {
                overallRating: best ? 'DESC' : 'ASC'
            },
            where: {
                numberOfEvaluations: MoreThan(10)
            },
            take:20,
            cache:ONE_DAY
        })
        return plainToClass(Teacher, result)
    }

    intersect<T extends DatabaseEntity>(arrays:T[][]): {intersect: T[], nonIntersect:T[]} {
        if(arrays.length == 1) {
            return {
                intersect:arrays[0],
                nonIntersect:[]
            }
        }
        const idToEntity = arrays.flat().reduce((acc,curr) => {
            acc[curr.id] = curr
            return acc
        }, {})
        const idArrays = arrays.map(arr => arr.map(x => x.id))
        let intersectionSet = new Set(idArrays[0])
        for(let array of idArrays.slice(1)) {
            const compareSet = new Set(array);
            intersectionSet = new Set([...intersectionSet].filter(x => compareSet.has(x)));
        }
        const nonIntersect = arrays.flat().filter(x => !intersectionSet.has(x.id))

        return {
            intersect: Array.from(intersectionSet).map(id => idToEntity[id]),
            nonIntersect
        }
      }
}

interface DatabaseEntity {
    id:number       
}