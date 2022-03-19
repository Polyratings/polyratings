import { DependencyInjector, InjectionToken, makeInjector } from "@mindspace-io/react";
import { Client } from "@polyratings/client";
import { StorageService } from "./storage.service";
import { AdminService } from "./admin.service";
import { AuthService } from "./auth.service";
import { Logger } from "./logger.service";
import { ReviewService } from "./review.service";
import { TeacherService } from "./teacher.service";
import { config } from "@/App.config";

export const CLIENT = new InjectionToken<Client>("client");

export const injector: DependencyInjector = injectorFactory();

export function injectorFactory() {
    return makeInjector([
        { provide: CLIENT, useFactory: () => new Client(config.clientEnv) },
        {
            provide: AuthService,
            useClass: AuthService,
            deps: [CLIENT, StorageService],
        },
        {
            provide: TeacherService,
            useClass: TeacherService,
            deps: [CLIENT, StorageService],
        },
        { provide: ReviewService, useClass: ReviewService, deps: [CLIENT, TeacherService] },
        {
            provide: AdminService,
            useClass: AdminService,
            deps: [CLIENT, AuthService, StorageService],
        },
        { provide: Logger, useClass: Logger },
        { provide: StorageService, useClass: StorageService },
    ]);
}
