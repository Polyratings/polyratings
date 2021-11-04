import { Controller, Get, Post, UseGuards, Request, Body, Param, UnauthorizedException, Redirect } from '@nestjs/common';
import { RegisterDto } from 'src/models/dtos/register.dto';
import { UserDto } from 'src/models/dtos/user.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth-guard';
import { GetUser } from './guards/get-user.guard';

@Controller('auth')
export class AuthController {

    constructor(
        private authService: AuthService
    ){}

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@GetUser() user:UserDto) {
        return this.authService.login(user)
    }

    @Post('register')
    async register(@Body() registrationInfo:RegisterDto) {
        return this.authService.register(registrationInfo.email, registrationInfo.password)
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@GetUser() user:UserDto) {
        return user;
    }

    @Get('confirmEmail/:userId/:otp')
    async searchName(@Param('userId') userId:number, @Param('otp') otp:string) {
        const user = await this.authService.confirmEmail(userId, otp)
        return await this.authService.login(user)
    }
}
