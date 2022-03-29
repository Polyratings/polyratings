import { useEffect, useState } from "react";
import { BasicBehaviorSubject } from "@/utils";

export function useBasicBehaviorSubject<T>(behaviorSubject: BasicBehaviorSubject<T>) {
    let initial: T;
    const initialSub = behaviorSubject.subscribe((val) => {
        initial = val;
    });
    initialSub.unsubscribe();
    // @ts-expect-error The behavior subject is guaranteed to run the callback once in sync
    const [value, setValue] = useState<T>(initial);
    useEffect(() => {
        const sub = behaviorSubject.subscribe(setValue);
        return () => {
            sub.unsubscribe();
        };
    }, []);
    return value;
}
