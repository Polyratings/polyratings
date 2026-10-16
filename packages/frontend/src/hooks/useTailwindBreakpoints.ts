import { useWindowSize } from "./useWindowSize";

export interface TailwindBreakpoints<T> {
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    "2xl"?: T;
}

const breakpointRanges: TailwindBreakpoints<[number, number]> = {
    sm: [640, 768],
    md: [768, 1024],
    lg: [1024, 1280],
    xl: [1280, 1536],
    "2xl": [1536, Infinity],
};

type breakpointRangeEntry = [keyof typeof breakpointRanges, [number, number]];

export function useTailwindBreakpoint<T>(breakpoints: TailwindBreakpoints<T>, defaultValue: T): T {
    const windowSize = useWindowSize();
    const internalValues: TailwindBreakpoints<T> = {};
    internalValues.sm = breakpoints.sm ?? defaultValue;
    internalValues.md = breakpoints.md ?? internalValues.sm;
    internalValues.lg = breakpoints.lg ?? internalValues.md;
    internalValues.xl = breakpoints.xl ?? internalValues.lg;
    internalValues["2xl"] = breakpoints["2xl"] ?? internalValues.xl;

    const windowWidth = windowSize.width;
    const entry = (Object.entries(breakpointRanges) as breakpointRangeEntry[]).find(
        ([, [lower, upper]]) => windowWidth >= lower && windowWidth < upper,
    );

    if (entry) {
        const [key] = entry;
        return internalValues[key] as T;
    }
    return defaultValue;
}
