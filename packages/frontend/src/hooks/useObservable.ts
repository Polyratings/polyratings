import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

export function useObservable<T>(observable: Observable<T>, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const sub = observable.subscribe(setValue);
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return value;
}
