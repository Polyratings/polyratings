import { DbEntryProperties } from '@polyratings-revamp/shared'

export function intersectingDbEntities<T extends DbEntryProperties>(arrays:T[][]): {intersect: T[], nonIntersect:T[]} {
    if(arrays.length == 1) {
        return {
            intersect:arrays[0],
            nonIntersect:[]
        }
    }
    const idToEntity = arrays.flat().reduce((acc:{[id:string]: T},curr) => {
        acc[curr.id] = curr
        return acc
    }, {})
    const idArrays = arrays.map(arr => arr.map(x => x.id))
    let intersectionSet = new Set(idArrays[0])
    for(let array of idArrays.slice(1)) {
        const compareSet = new Set(array);
        intersectionSet = new Set([...intersectionSet].filter(x => compareSet.has(x)));
    }
    const nonIntersect = arrays.flat().filter(x => !intersectionSet.has(x.id))

    return {
        intersect: Array.from(intersectionSet).map(id => idToEntity[id]),
        nonIntersect
    }
}