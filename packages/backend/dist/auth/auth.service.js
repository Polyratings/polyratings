"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../models/entities/user.entity");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nest_sendgrid_1 = require("@anchan828/nest-sendgrid");
const user_dto_1 = require("../models/dtos/user.dto");
let AuthService = class AuthService {
    constructor(userRepository, jwtService, sendGrid) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.sendGrid = sendGrid;
        this.bannedJwtIds = new Set();
    }
    async validateUserLocal(email, password) {
        const userEntity = await this.userRepository.findOne({ email });
        if (!userEntity) {
            return null;
        }
        if (!userEntity.emailConfirmed) {
            throw new common_1.UnauthorizedException(`Please confirm your email ${userEntity.email}`);
        }
        if (userEntity.isBanned) {
            throw new common_1.UnauthorizedException(`You have been banned. If this is a mistake contact maxmfishernj@gmail.com`);
        }
        const isMatch = await bcrypt.compare(password, userEntity.password);
        if (isMatch) {
            return userEntity;
        }
        return null;
    }
    validateUserJwt(user) {
        if (this.bannedJwtIds.has(user.sub)) {
            throw new common_1.UnauthorizedException(`You have been banned. If this is a mistake contact maxmfishernj@gmail.com`);
        }
        return user;
    }
    async login(user) {
        const payload = { email: user.email, sub: user.id, isAdmin: user.isAdmin };
        const jwt = await this.jwtService.signAsync(payload, { secret: process.env.JWT_SECRET });
        return {
            access_token: jwt
        };
    }
    async register(email, password) {
        if (!email.endsWith('@calpoly.edu')) {
            throw new common_1.UnauthorizedException('Email is not a valid Cal Poly Email');
        }
        const existingUser = await this.userRepository.findOne({ email });
        if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.emailConfirmed) === false) {
            throw new common_1.UnauthorizedException(`Please confirm your email ${existingUser.email}`);
        }
        if (existingUser) {
            throw new common_1.ConflictException('A user with the email already exists');
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await this.userRepository.save({
            email,
            password: hashedPassword,
            otp: this.generateOtp()
        });
        const confirmEmail = {
            from: 'maxmfishernj@gmail.com',
            personalizations: [{
                    to: newUser.email,
                    dynamic_template_data: {
                        otp: newUser.otp,
                        user_id: newUser.id,
                        frontend_url: process.env.FRONTEND_URL
                    }
                }],
            template_id: 'd-1bd8f590eeb443ca95f0913a222f9bd1'
        };
        try {
            await this.sendGrid.send(confirmEmail);
        }
        catch (e) {
            console.error(e.response.body);
        }
    }
    getUser(id) {
        return this.userRepository.findOne(id);
    }
    generateOtp() {
        const stringBuf = crypto.randomBytes(255);
        return stringBuf.toString('hex');
    }
    async confirmEmail(userId, otp) {
        const user = await this.getUser(userId);
        if (!user || user.otp != otp) {
            throw new common_1.UnauthorizedException('Bad confirmation request');
        }
        user.emailConfirmed = true;
        user.otp = this.generateOtp();
        this.userRepository.save(user);
        return user;
    }
    async banUser(userId) {
        const user = await this.userRepository.findOne(userId);
        if (!user) {
            throw new common_1.BadRequestException('User Id Not Valid');
        }
        user.isBanned = true;
        this.bannedJwtIds.add(user.id);
        await this.userRepository.save(user);
    }
};
AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService, typeof (_a = typeof nest_sendgrid_1.SendGridService !== "undefined" && nest_sendgrid_1.SendGridService) === "function" ? _a : Object])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map