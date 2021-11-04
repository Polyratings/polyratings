import { AuthService } from "src/auth/auth.service"
import { UserEntity } from "../entities/user.entity"

export class UserDto {
    constructor(
        public readonly id:number,
        public readonly email:string
    ){}

    public toEntity(authService:AuthService): Promise<UserEntity> {
        return authService.getUser(this.id)
    }
}