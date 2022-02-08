export function roundToPrecision(roundingTarget:number, precision:number) {
    return Math.round((roundingTarget + Number.EPSILON) * (10 ** precision)) / (10 ** precision)
}
