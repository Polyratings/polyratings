import { DependencyInjector, InjectionToken, makeInjector } from "@mindspace-io/react";
import { StorageService } from "./storage.service";
import { AdminService } from "./admin.service";
import { AuthService } from "./auth.service";
import { HttpService } from "./http.service";
import { Logger } from "./logger.service";
import { ReviewService } from "./review.service";
import { TeacherService } from "./teacher.service";

export const FETCH = new InjectionToken<typeof fetch>("fetch");

export const injector: DependencyInjector = injectorFactory();

export function injectorFactory() {
    return makeInjector([
        { provide: FETCH, useFactory: () => window.fetch.bind(window) },
        { provide: AuthService, useClass: AuthService, deps: [StorageService, FETCH] },
        { provide: HttpService, useClass: HttpService, deps: [AuthService, FETCH] },
        { provide: TeacherService, useClass: TeacherService, deps: [HttpService, StorageService] },
        { provide: ReviewService, useClass: ReviewService, deps: [HttpService, TeacherService] },
        {
            provide: AdminService,
            useClass: AdminService,
            deps: [HttpService, AuthService, StorageService],
        },
        { provide: Logger, useClass: Logger },
        { provide: StorageService, useClass: StorageService },
    ]);
}
