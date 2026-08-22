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

/**
 * Maps `items` with at most `concurrency` in-flight promises at a time.
 * Each window of work is awaited before the next window starts.
 */
export async function mapInBatches<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>,
): Promise<R[]> {
    if (concurrency <= 0) {
        throw new Error("Concurrency must be greater than 0");
    }

    const results: R[] = [];
    for (const batch of chunkArray(items, concurrency)) {
        // eslint-disable-next-line no-await-in-loop -- windows must complete before the next starts
        const batchResults = await Promise.all(batch.map(mapper));
        results.push(...batchResults);
    }
    return results;
}
