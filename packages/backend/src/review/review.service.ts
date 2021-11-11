import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToClass } from 'class-transformer';
import { AddReviewDto } from 'src/models/dtos/addReview.dto';
import { ReviewDto } from 'src/models/dtos/review.dto';
import { TeacherDto } from 'src/models/dtos/teacher.dto';
import { ClassEntity } from 'src/models/entities/class.entity';
import { ReviewEntity } from 'src/models/entities/review.entitiy';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { TeacherService } from 'src/teacher/services/teacher.service';
import { intersectingDbEntities } from 'src/utils/intersectingDbEntities';
import { ILike, MoreThan, Repository } from 'typeorm';
import { naughtyWords } from './naughtyWords';

@Injectable()
export class ReviewService {
    constructor(
        @InjectRepository(TeacherEntity)
        private readonly teacherRepository: Repository<TeacherEntity>,
        @InjectRepository(ClassEntity)
        private readonly classRepository: Repository<ClassEntity>,
        @InjectRepository(ReviewEntity)
        private readonly reviewRepository: Repository<ReviewEntity>,
        private teacherService:TeacherService
    ){}

    async addReview(reviewAdditionRequest:AddReviewDto):Promise<TeacherDto> {
        const teacher = await this.teacherRepository.findOne(reviewAdditionRequest.teacherId)
        if(!teacher) {
            throw 'Bad Teacher Id'
        }
        if(this.isNumeric(reviewAdditionRequest.classIdOrName)) {
            const taughtClass = await this.classRepository.findOne(reviewAdditionRequest.classIdOrName, {relations:['reviews']})

            // Deliberately cast dto to entity type in order to save to database
            taughtClass.reviews.push(reviewAdditionRequest.review as ReviewEntity)
            await this.classRepository.save(taughtClass)
        } else {
            await this.classRepository.save({
                teacher:teacher,
                name:reviewAdditionRequest.classIdOrName,
                reviews:[reviewAdditionRequest.review]
            })
        }

        // Find new averages and add to the total
        teacher.overallRating = this.recalculateAverage(
            teacher.overallRating, 
            teacher.numberOfEvaluations, 
            reviewAdditionRequest.overallRating
        )
        teacher.recognizesStudentDifficulties = this.recalculateAverage(
            teacher.recognizesStudentDifficulties,
            teacher.numberOfEvaluations,
            reviewAdditionRequest.recognizesStudentDifficulties
        )
        teacher.presentsMaterialClearly = this.recalculateAverage(
            teacher.presentsMaterialClearly,
            teacher.numberOfEvaluations,
            reviewAdditionRequest.presentsMaterialClearly
        )
        teacher.numberOfEvaluations++


        await this.teacherRepository.save(teacher)
        return this.teacherService.getTeacherById(teacher.id)
    }

    async getRecent():Promise<ReviewDto[]> {
        const reviewEntities = await this.reviewRepository.find({
            order: {
                createdAt: 'DESC'
            },
            take:50
        })
        return reviewEntities.map(t => plainToClass(ReviewDto, t))
    }

    private recalculateAverage(original:number, count:number, newValue:number):number {
        return original * count * newValue / (count + 1)
    }
    
    private isNumeric(str:string) {
        return !isNaN(str as any) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
               !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
    }
    
    async flagReviews(): Promise<number> {
        const whereClause = naughtyWords.map(word => `TEXT ILIKE '%${word}%'`).join(' OR ')
        const query = `SELECT * FROM review WHERE "reportCount" = 0 AND (${whereClause})`
        const results = await this.reviewRepository.query(query) as ReviewEntity[]
        results.forEach(result => result.reportCount++)
        await this.reviewRepository.save(results, {chunk:40})
        return results.length
    }

    async getFlaggedReviews(): Promise<ReviewDto[]> {
        const flaggedReviews = await this.reviewRepository.find({
            where: {
                reportCount: MoreThan(0)
            }
        })
        return flaggedReviews.map(review => plainToClass(ReviewDto, review))
    }

    async flagReview(reviewId:number):Promise<void> {
        const review = await this.reviewRepository.findOne(reviewId)
        if(!review) {
            throw new BadRequestException('Invalid Review ID')
        }
        review.reportCount++
        await this.reviewRepository.save(review)
    }

}
