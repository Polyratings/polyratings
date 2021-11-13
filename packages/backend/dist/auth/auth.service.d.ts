import { JwtService } from '@nestjs/jwt';
import { UserEntity } from 'src/models/entities/user.entity';
import { JwtAuthResponse } from '@polyratings-revamp/shared';
import { Repository } from 'typeorm';
import { SendGridService } from '@anchan828/nest-sendgrid';
import { UserDto } from 'src/models/dtos/user.dto';
export declare class AuthService {
    private readonly userRepository;
    private jwtService;
    private sendGrid;
    private bannedJwtIds;
    constructor(userRepository: Repository<UserEntity>, jwtService: JwtService, sendGrid: SendGridService);
    validateUserLocal(email: string, password: string): Promise<UserEntity | null>;
    validateUserJwt(user: UserDto): UserDto;
    login(user: UserEntity): Promise<JwtAuthResponse>;
    register(email: string, password: string): Promise<void>;
    getUser(id: number): Promise<UserEntity | undefined>;
    generateOtp(): string;
    confirmEmail(userId: number, otp: string): Promise<UserEntity>;
    banUser(userId: number): Promise<void>;
}
