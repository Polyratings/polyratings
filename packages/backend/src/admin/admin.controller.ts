import { Controller, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
    constructor(
        private adminService:AdminService,
        private authService:AuthService
    ){}

    @Delete('teacher/:id')
    async deleteTeacher(@Param('id', ParseIntPipe) id:number) {
        throw 'Unfinished'
        await this.adminService.deleteTeacher(id)
    }

    @Delete('review/:id')
    async deleteReview(@Param('id', ParseIntPipe) id:number) {
        throw 'Unfinished'
        await this.adminService.deleteReview(id)
    }

    @Delete('user/:id')
    async banUser(@Param('id', ParseIntPipe) id:number) {
        throw 'Unfinished'
        await this.authService.banUser(id)
    }
}
