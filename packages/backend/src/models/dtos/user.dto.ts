import { AuthService } from "src/auth/auth.service"
import { UserEntity } from "../entities/user.entity"
import { User } from "@polyratings-revamp/shared"

export class UserDto implements User {
    
    public readonly sub:number
    public readonly email:string
    public readonly isAdmin:boolean
    
    constructor({sub, email, isAdmin}:User){
        this.sub = sub
        this.email = email
        this.isAdmin = isAdmin
    }

    public toEntity(authService:AuthService): Promise<UserEntity> {
        return authService.getUser(this.sub)
    }
}