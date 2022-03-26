import { renderHook, RenderResult } from "@testing-library/react-hooks";
import { act } from "react-dom/test-utils";
import { BasicBehaviorSubject } from "@/utils";
import { useBasicBehaviorSubject } from "./useBasicBehaviorSubject";

let subject: BasicBehaviorSubject<number>;
let result: RenderResult<number>;
describe("UseObservable", () => {
    beforeEach(() => {
        subject = new BasicBehaviorSubject(0);
        ({ result } = renderHook(() => useBasicBehaviorSubject(subject)));
    });

    it("defaults to a value", () => {
        expect(result.current).toBe(0);
    });

    it("is reactive", () => {
        act(() => subject.next(2));
        expect(result.current).toBe(2);
        act(() => subject.next(4));
        expect(result.current).toBe(4);
    });
});
