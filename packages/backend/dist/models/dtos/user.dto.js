"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDto = void 0;
const auth_service_1 = require("../../auth/auth.service");
class UserDto {
    constructor({ sub, email, isAdmin }) {
        this.sub = sub;
        this.email = email;
        this.isAdmin = isAdmin;
    }
    toEntity(authService) {
        return authService.getUser(this.sub);
    }
}
exports.UserDto = UserDto;
//# sourceMappingURL=user.dto.js.map