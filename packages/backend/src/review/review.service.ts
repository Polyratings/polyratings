import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AddReview } from 'src/models/dtos/addReview.dto';
import { Teacher } from 'src/models/dtos/teacher.dto';
import { ClassEntity } from 'src/models/entities/class.entity';
import { ReviewEntity } from 'src/models/entities/review.entitiy';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { TeacherService } from 'src/teacher/services/teacher.service';
import { Repository } from 'typeorm';

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

    async addReview(reviewAdditionRequest:AddReview):Promise<Teacher> {
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
        return this.teacherService.getTeacherById(`${teacher.id}`)
    }

    private recalculateAverage(original:number, count:number, newValue:number):number {
        return original * count * newValue / (count + 1)
    }

    async setTimestamps() {
        const allReviews = await this.reviewRepository.find()
        const monthMap = {
            Jan:0,
            Feb:1,
            Mar:2,
            Apr:3,
            May:4,
            Jun:5,
            Jul:6,
            Aug:7,
            Sep:8,
            Oct:9,
            Nov:10,
            Dec:11
        }
        const allReviewsTimestampCorrected = allReviews.map(review => {
            const [monthStr, yearStr] = review.timeStamp.split(' ').map(s => s.trim())
            const year = parseInt(yearStr)
            const monthNum = monthMap[monthStr]
            if(monthNum == undefined) {
                throw 'Canceling migration issue ' + monthStr
            }
            review.createdAt = new Date(year, monthNum)
            return review
        })
        this.reviewRepository.save(allReviewsTimestampCorrected, {chunk:30})
    }
    
    private isNumeric(str:string) {
        return !isNaN(str as any) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
               !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
    }

}
