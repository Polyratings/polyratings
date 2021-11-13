import { AuthService } from 'src/auth/auth.service';
import { AdminService } from './admin.service';
export declare class AdminController {
    private adminService;
    private authService;
    constructor(adminService: AdminService, authService: AuthService);
    deleteTeacher(id: number): Promise<void>;
    deleteReview(id: number): Promise<void>;
    banUser(id: number): Promise<void>;
}
