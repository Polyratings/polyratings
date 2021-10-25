import { DependencyInjector, InjectionToken, makeInjector } from "@mindspace-io/react";
import { AuthService } from "./auth.service";
import { HttpService } from "./http.service";
import { TeacherService } from "./teacher.service";

const LOCAL_STORAGE = new InjectionToken('local-storage')

export const injector:DependencyInjector = makeInjector([
    { provide: LOCAL_STORAGE, useValue:window.localStorage },
    { provide: AuthService, useClass:AuthService, deps:[LOCAL_STORAGE] },
    { provide: HttpService, useClass: HttpService, deps:[AuthService] },
    { provide: TeacherService, useClass: TeacherService, deps:[HttpService] }
])

export { AuthService, HttpService, TeacherService }
