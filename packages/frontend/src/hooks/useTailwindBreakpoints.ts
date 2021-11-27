import { useEffect, useState } from "react"
import { useWindowSize } from "./useWindowSize"

export interface TailwindBreakpoints<T> {
    sm?:T
    md?:T,
    lg?:T,
    xl?:T
    '2xl'?:T
}

const breakpointRanges:TailwindBreakpoints<[number,number]> = {
    sm: [640, 768],
    md: [768, 1024],
    lg: [1024, 1280],
    xl: [1280, 1536],
    '2xl': [1536, Infinity]
}


export function useTailwindBreakpoint<T>(breakpoints:TailwindBreakpoints<T>, defaultValue:T):T {
    const windowSize = useWindowSize()
    const [outputValue, setOutputValue] = useState<T>(defaultValue)
    const internalValues:TailwindBreakpoints<T> = {}
    internalValues.sm = breakpoints.sm ?? defaultValue
    internalValues.md = breakpoints.md ?? internalValues.sm
    internalValues.lg = breakpoints.lg ?? internalValues.md
    internalValues.xl = breakpoints.xl ?? internalValues.lg
    internalValues['2xl'] = breakpoints['2xl'] ?? internalValues.xl

    useEffect(() => {
        const windowWidth = window.innerWidth
        for(let [key, [lower, upper]] of Object.entries(breakpointRanges) as [keyof TailwindBreakpoints<T>, [number,number]][]) {
            if(windowWidth >= lower && windowWidth < upper) {
                // Always defined
                setOutputValue(internalValues[key] as T)
                return
            }
        }
        setOutputValue(defaultValue)
    },[windowSize.width])

    return outputValue
}