import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AddReview } from 'src/models/dtos/addReview.dto';
import { ReviewService } from './review.service';

@Controller('review')
export class ReviewController {

    constructor(
        private reviewService:ReviewService
    ){}

    @UseGuards(JwtAuthGuard)
    @Post()
    async addReview(@Body() reviewAdditionRequest:AddReview) {
        return this.reviewService.addReview(reviewAdditionRequest)
    }

}
