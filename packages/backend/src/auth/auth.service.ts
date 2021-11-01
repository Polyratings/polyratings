import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/models/entities/user.entity';
import { JwtAuthResponse } from 'src/models/interfaces/JwtAuthResponse';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto'
import { User } from 'src/models/dtos/user.dto';
import { SendGridService } from '@anchan828/nest-sendgrid';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private jwtService: JwtService,
        private sendGrid:SendGridService
    ){}

    async validateUser(email:string, password:string):Promise<User | null> {
        const UserEntity = await this.userRepository.findOne({email});
        if(!UserEntity) {
            return null
        }
        if(!UserEntity.emailConfirmed) {
            throw new UnauthorizedException(`Please confirm your email ${UserEntity.email}`)
        }
        const isMatch = await bcrypt.compare(password, UserEntity.password)
        if (isMatch) {
            return new User(UserEntity.id, UserEntity.email)
        }
        return null;
    }

    async login(user:User | UserEntity): Promise<JwtAuthResponse> {
        const payload = {email: user.email, sub:user.id}
        const jwt = await this.jwtService.signAsync(payload, {secret:process.env.JWT_SECRET})
        return {
            access_token: jwt
        }
    }

    async register(email:string, password:string):Promise<void> {
        if(!email.endsWith('@calpoly.edu')) {
            throw new UnauthorizedException('Email is not a valid Cal Poly Email')
        }
        const existingUser = await this.userRepository.findOne({email})
        if(existingUser?.emailConfirmed === false) {
            throw new UnauthorizedException(`Please confirm your email ${existingUser.email}`)
        }
        if(existingUser) {
            throw new ConflictException('A user with the email already exists')
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await this.userRepository.save({
            email,
            password:hashedPassword,
            otp:this.generateOtp()
        })

        // TODO: Get real email
        const confirmEmail = {
            from: 'maxmfishernj@gmail.com', // Change to your verified sender
            personalizations: [{
                to: newUser.email, // Change to your recipient,
                dynamic_template_data:{
                    otp:newUser.otp,
                    user_id:newUser.id,
                    frontend_url:process.env.FRONTEND_URL
                }
            }],
            template_id:'d-1bd8f590eeb443ca95f0913a222f9bd1'
        }
        try {
            await this.sendGrid.send(confirmEmail)
        } catch(e) {
            console.error(e.response.body)
        }  
    }

    getUser(id:number):Promise<UserEntity | undefined> {
        return this.userRepository.findOne(id)
    }

    generateOtp():string {
        const stringBuf = crypto.randomBytes(255)
        return stringBuf.toString('hex')
    }

    async confirmEmail(userId:number, otp:string):Promise<UserEntity> {
        const user = await this.getUser(userId)
        if(!user || user.otp != otp) {
            throw new UnauthorizedException('Bad confirmation request')
        }

        user.emailConfirmed = true
        user.otp = this.generateOtp()

        this.userRepository.save(user)
        return user
    }
}
