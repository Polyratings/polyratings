import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AddReviewDto } from 'src/models/dtos/addReview.dto';
import { ReviewService } from './review.service';

@Controller('review')
export class ReviewController {

    constructor(
        private reviewService:ReviewService
    ){}

    @UseGuards(JwtAuthGuard)
    @Post()
    async addReview(@Body() reviewAdditionRequest:AddReviewDto) {
        return this.reviewService.addReview(reviewAdditionRequest)
    }

    @Put(':id')
    async flagReview(@Param('id', ParseIntPipe) id:number) {

    }

    @Get('recent')
    async getRecent() {
        return this.reviewService.getRecent()
    }

    @Get('flag')
    async flagReviews() {
        return this.reviewService.getFlaggedReviews()
    }

    @UseGuards(JwtAuthGuard)
    @Post('flag')
    async getFlagged() {
        const flagCount = await this.reviewService.flagReviews()
        return `Flagged ${flagCount} reviews successfully`
    }

}
