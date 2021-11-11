import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClassEntity } from 'src/models/entities/class.entity';
import { ReviewEntity } from 'src/models/entities/review.entitiy';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(TeacherEntity)
        private readonly teacherRepository: Repository<TeacherEntity>,
        @InjectRepository(ClassEntity)
        private readonly classRepository: Repository<ClassEntity>,
        @InjectRepository(ReviewEntity)
        private readonly reviewRepository: Repository<ReviewEntity>,
    ){}

    async deleteTeacher(teacherId: number) {
        const teacher = await this.teacherRepository.findOne(teacherId, {
            relations:['classes', 'classes.reviews'],
        })

        if(!teacher) {
            throw new BadRequestException('Teacher Id Not Valid')
        }

        // Can use Promise.all but think this is ok for now
        for(let taughtClass of teacher.classes) {
            for(let review of taughtClass.reviews) {
                await this.reviewRepository.delete(review.id)
            }
            await this.classRepository.delete(taughtClass.id)
        }

        await this.teacherRepository.delete(teacherId)
    }

    async deleteClass(classId: number): Promise<void> {
        const taughtClass = await this.classRepository.findOne(classId, {relations:['teacher', 'reviews']})
        if(!taughtClass) {
            throw new BadRequestException('Class Id Not Valid')
        }

        // Can use a promise.all instead but it is not speed critical as it is in the admin panel
        for(let review of taughtClass.reviews) {
            await this.reviewRepository.delete(review.id)
        }

        // We just deleted the last class so delete the teacher as well
        if(taughtClass.teacher.classes.length == 1) {
            return this.deleteTeacher(taughtClass.teacher.id)
        }
    }

    async deleteReview(reviewId: number): Promise<void> {
        const review = await this.reviewRepository.findOne(reviewId,{relations:['class']})
        if(!review) {
            throw new BadRequestException('Review Id Not Valid')
        }

        await this.reviewRepository.delete(reviewId)

        // We just deleted the last review so delete the class as well
        if(review.class.reviews.length == 1) {
            return this.deleteClass(review.class.id)
        }

    }

}
