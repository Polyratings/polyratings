import { DependencyInjector, InjectionToken, makeInjector } from '@mindspace-io/react';
import { AuthService } from './auth.service';
import { HttpService } from './http.service';
import { Logger } from './logger.service';
import { ReviewService } from './review.service';
import { TeacherService } from './teacher.service';

export const LOCAL_STORAGE = new InjectionToken<Storage>('local-storage');
export const FETCH = new InjectionToken<typeof fetch>('fetch');

export const injector: DependencyInjector = injectorFactory();

export function injectorFactory() {
  return makeInjector([
    { provide: LOCAL_STORAGE, useValue: window.localStorage },
    { provide: FETCH, useFactory: () => window.fetch.bind(window) },
    { provide: AuthService, useClass: AuthService, deps: [LOCAL_STORAGE, FETCH] },
    { provide: HttpService, useClass: HttpService, deps: [AuthService, FETCH] },
    { provide: TeacherService, useClass: TeacherService, deps: [HttpService, LOCAL_STORAGE] },
    { provide: ReviewService, useClass: ReviewService, deps: [HttpService] },
    { provide: Logger, useClass: Logger },
  ]);
}

export { AuthService, HttpService, TeacherService, ReviewService, Logger };
