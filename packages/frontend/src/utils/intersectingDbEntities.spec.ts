import { intersectingDbEntities } from '.';

interface ImplementsToString {
    toString():string
}
function createDbEntity(v:ImplementsToString) {
    return { id: v.toString() };
}
describe('intersectingDbEntities', () => {
    it('Finds intersections for a single array', () => {
        const arr = [createDbEntity(1)];
        const { intersect } = intersectingDbEntities([arr]);
        expect(intersect).toMatchObject(arr);
    });

    it('Finds intersections for fully overlapping', () => {
        const arr = [1, 2, 3].map(createDbEntity);
        const { intersect } = intersectingDbEntities([arr, arr]);
        expect(intersect).toMatchObject(arr);
    });

    it('Finds intersections for partially overlapping', () => {
        const arr1 = [1, 2, 3].map(createDbEntity);
        const arr2 = [3, 4, 5].map(createDbEntity);
        const { intersect } = intersectingDbEntities([arr1, arr2]);
        expect(intersect).toMatchObject([createDbEntity(3)]);
    });

    it('Finds no intersections on non overlapping array', () => {
        const arr1 = [1, 2, 3].map(createDbEntity);
        const arr2 = [4, 5, 6].map(createDbEntity);
        const { intersect } = intersectingDbEntities([arr1, arr2]);
        expect(intersect).toMatchObject([]);
    });

    it('Finds intersections on more than two arrays', () => {
        const arr1 = [1, 2, 3].map(createDbEntity);
        const arr2 = [2, 3, 4].map(createDbEntity);
        const arr3 = [3, 4, 5].map(createDbEntity);
        const { intersect } = intersectingDbEntities([arr1, arr2, arr3]);
        expect(intersect).toMatchObject([createDbEntity(3)]);
    });
});
