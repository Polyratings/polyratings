export function chunkArray<T>(arr:T[], size:number):T[][] {
    const arrShallowClone = [...arr]
    const chunked = []
    while(arrShallowClone.length) {
        chunked.push(arrShallowClone.splice(0, size))
    }
    return chunked
}
