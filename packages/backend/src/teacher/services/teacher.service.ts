import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { TeacherDto } from 'src/models/dtos/teacher.dto';
import { ILike, MoreThan, Repository, Raw } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { intersectingDbEntities } from 'src/utils/intersectingDbEntities';

@Injectable()
export class TeacherService {
    constructor(
        @InjectRepository(TeacherEntity)
        private readonly teacherRepository: Repository<TeacherEntity>
    ){}
    
    async createTeacher(teacher:TeacherDto): Promise<TeacherEntity> {
        // Checks to make sure new teacher is not being shoved in with multiple reviews
        if(teacher.numberOfEvaluations != 1) {
            throw new BadRequestException('Can only insert a teacher with numberOfEvaluations == 1')
        }
        if(teacher.classes.length != 1) {
            throw new BadRequestException('Can only insert a teacher with one class')
        }
        if(teacher.classes[0].reviews.length != 1) {
            throw new BadRequestException('Can only insert a teacher with one review')
        }
        const existingTeacher = await this.teacherRepository.findOne({
            where:{
                name:ILike(`%${teacher.name}%`),
                department:teacher.department
            }
        })
        if(existingTeacher) {
            throw new BadRequestException('There exists a teacher already with that name and department')
        }
        return this.teacherRepository.save(teacher)
    }

    async getTeacherByName(name:string = ''): Promise<TeacherDto[]> {
        const tokenMatches =  await Promise.all(
            name
            .split(' ')
            .map(token => this.teacherRepository.find({
                where:{
                    name:ILike(`%${token}%`)
                }
            }))
        )
        const { intersect, nonIntersect } = intersectingDbEntities(tokenMatches)
        return [...intersect, ...nonIntersect].map(entity => plainToClass(TeacherDto, entity))
    }

    async getTeacherById(id:number): Promise<TeacherDto | undefined> {
        const result = await this.teacherRepository.findOne(id, {
            relations:['classes', 'classes.reviews'],
        })
        if(result) {
            const teacher =  plainToClass(TeacherDto, result)
            // In memory sort of reviews by timestamp
            // Would like to do this at the database level but it is not supported yet
            // https://github.com/typeorm/typeorm/issues/2620
            teacher
            .classes
            .forEach(taughtClass => 
                taughtClass.reviews.sort( (a,b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
            )
            return teacher
        }
    }

    async getWorstOrBest(best:boolean) : Promise<TeacherDto[]> {
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
        return plainToClass(TeacherDto, result)
    }

    async getRecent():Promise<TeacherDto[]> {
        const TeacherEntities = await this.teacherRepository.find({
            order: {
                createdAt: 'DESC'
            },
            take:50
        })
        return TeacherEntities.map(t => plainToClass(TeacherDto, t))
    }


}

interface DatabaseEntity {
    id:number       
}