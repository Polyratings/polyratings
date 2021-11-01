import { Body, Controller, Get, Post } from '@nestjs/common';
import { AddReview } from 'src/models/dtos/addReview.dto';
import { ReviewService } from './review.service';

@Controller('review')
export class ReviewController {

    constructor(
        private reviewService:ReviewService
    ){}

    @Post('add')
    async addReview(@Body() reviewAdditionRequest:AddReview) {
        return this.reviewService.addReview(reviewAdditionRequest)
    }

    @Get('fixTimestamp')
    async fixTimestamps() {
        await this.reviewService.setTimestamps()
    }
}
