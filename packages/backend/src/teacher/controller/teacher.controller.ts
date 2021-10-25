import { Body, Controller, Get, Param, Post, BadRequestException } from '@nestjs/common';
import { Teacher } from 'src/models/dtos/teacher.dto';
import { TeacherService } from '../services/teacher.service';

@Controller('teacher')
export class TeacherController {
    constructor(
        private teacherService: TeacherService
    ){}

    @Post()
    async create(@Body() teacher:Teacher) {
        await this.teacherService.createTeacher(teacher)
    }

    @Get('all')
    async retrieveAll() {
        return this.teacherService.getTeacherByName()
    }

    @Get('worst')
    async retrieveWorst() {
        const worstTeacher = await this.teacherService.getWorstOrBest(false)
        return this.getRandomSubarray(worstTeacher, 6)
    }

    @Get('best')
    async retrieveBest() {
        const worstTeacher = await this.teacherService.getWorstOrBest(true)
        return this.getRandomSubarray(worstTeacher, 1)[0]
    }

    @Get(':id')
    async get(@Param('id') id:string) {
        const teacher = await this.teacherService.getTeacherById(id)
        if(teacher) {
            return this.teacherService.getTeacherById(id)
        }
        throw new BadRequestException('Invalid teacher id');
    }

    @Get('search/:name')
    async searchName(@Param('name') name:string) {
        return this.teacherService.getTeacherByName(name)
    }

    private getRandomSubarray<T>(arr:T[], size:number):T[] {
        var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    }
    


}
