import { useEffect, useState } from "react"
import { Observable } from "rxjs"

export function useObservable<T>(observable:Observable<T>) {
    let [value, setValue] = useState<T>()
    useEffect(() => {
        const sub = observable.subscribe(setValue)
        return () => {
            sub.unsubscribe()
        }
    },[])
    return value
}