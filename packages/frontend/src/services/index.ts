import { DependencyInjector, InjectionToken, makeInjector } from "@mindspace-io/react";
import { AuthService } from "./auth.service";
import { HttpService } from "./http.service";
import { ReviewService } from "./review.service";
import { TeacherService } from "./teacher.service";

const LOCAL_STORAGE = new InjectionToken<Storage>('local-storage')
const FETCH = new InjectionToken<typeof fetch>('fetch')

export const injector:DependencyInjector = makeInjector([
    { provide: LOCAL_STORAGE, useValue:window.localStorage },
    { provide: FETCH, useFactory:() => window.fetch.bind(window) },
    { provide: AuthService, useClass:AuthService, deps:[LOCAL_STORAGE, FETCH] },
    { provide: HttpService, useClass: HttpService, deps:[AuthService, FETCH] },
    { provide: TeacherService, useClass: TeacherService, deps:[HttpService] },
    { provide: ReviewService, useClass: ReviewService, deps:[HttpService] }
])

export { AuthService, HttpService, TeacherService, ReviewService }
