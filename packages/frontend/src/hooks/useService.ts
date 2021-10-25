import { DependencyInjector, HookTuple, useInjectorHook } from "@mindspace-io/react";
import { injector } from "../services";

type Constructs<T> = (new (...args: any[]) => T)

export function useService<T>(token:Constructs<T>):HookTuple<T, DependencyInjector> {
    return useInjectorHook(token, injector)
}