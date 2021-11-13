import { RegisterDto } from 'src/models/dtos/register.dto';
import { UserDto } from 'src/models/dtos/user.dto';
import { AuthService } from './auth.service';
import { UserEntity } from 'src/models/entities/user.entity';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(user: UserEntity): Promise<import("@polyratings-revamp/shared").JwtAuthResponse>;
    register(registrationInfo: RegisterDto): Promise<void>;
    getProfile(user: UserDto): UserDto;
    searchName(userId: number, otp: string): Promise<import("@polyratings-revamp/shared").JwtAuthResponse>;
}
