/**
 * Chunks an array into smaller arrays of specified size.
 *
 * @param array - The array to chunk
 * @param size - The size of each chunk
 * @returns An array of chunks
 *
 * @example
 * ```ts
 * chunkArray([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
    if (size <= 0) {
        throw new Error("Chunk size must be greater than 0");
    }

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
