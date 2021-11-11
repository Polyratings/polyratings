import { Body, Controller, Get, Param, Post, BadRequestException, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TeacherDto } from 'src/models/dtos/teacher.dto';
import { TeacherIdResponse } from '@polyratings-revamp/shared';
import { getRandomSubarray } from 'src/utils/getRandomSubarray';
import { TeacherService } from '../services/teacher.service';

@Controller('teacher')
export class TeacherController {
    constructor(
        private teacherService: TeacherService
    ){}

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Body() teacher:TeacherDto):Promise<TeacherIdResponse> {
        const newTeacher = await this.teacherService.createTeacher(teacher)
        return {
            teacherId: newTeacher.id
        }
    }

    @Get('all')
    async retrieveAll() {
        return this.teacherService.getTeacherByName()
    }

    @Get('worst')
    async retrieveWorst() {
        const worstTeacher = await this.teacherService.getWorstOrBest(false)
        return getRandomSubarray(worstTeacher, 6)
    }

    @Get('best')
    async retrieveBest() {
        const worstTeacher = await this.teacherService.getWorstOrBest(true)
        return getRandomSubarray(worstTeacher, 1)[0]
    }

    @Get(':id')
    async get(@Param('id', ParseIntPipe) id:number) {
        const teacher = await this.teacherService.getTeacherById(id)
        if(teacher) {
            return teacher
        }
        throw new BadRequestException('Invalid teacher id');
    }

    @Get('search/:name')
    async searchName(@Param('name') name:string) {
        return this.teacherService.getTeacherByName(name)
    }

    @Get('recent')
    async getRecent() {
        return this.teacherService.getRecent()
    }


}
