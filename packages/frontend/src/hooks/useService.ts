import { useInjectorHook } from '@mindspace-io/react';
import { injector } from '@/services';

type Constructs<T> = new (...args: never[]) => T;

export function useService<T>(token: Constructs<T>): T {
  const [service] = useInjectorHook(token, injector);
  return service;
}
