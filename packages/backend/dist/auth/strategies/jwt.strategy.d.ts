import { Strategy } from 'passport-jwt';
import { UserDto } from 'src/models/dtos/user.dto';
import { User } from '@polyratings-revamp/shared';
import { AuthService } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(payload: User): Promise<UserDto>;
}
export {};
