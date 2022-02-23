import { renderHook, RenderResult } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/dom';
import { setWindowSize } from '@/test-utils';
import { useTailwindBreakpoint } from './useTailwindBreakpoints';

const DEFAULT_VALUE = 1;
const SM_VALUE = 2;
const XL_VALUE = 3;

let result: RenderResult<number>;
describe('UseTailwindBreakpoints', () => {
    beforeEach(() => {
        ({ result } = renderHook(() =>
            useTailwindBreakpoint(
                {
                    sm: SM_VALUE,
                    xl: XL_VALUE,
                },
                DEFAULT_VALUE,
            ),
        ));
    });

    it('sends default value if small', async () => {
        act(() => {
            setWindowSize(100, window.innerHeight);
        });
        await waitFor(() => {
            expect(result.current).toBe(DEFAULT_VALUE);
        });
    });

    it('uses sm value for sm range', async () => {
        act(() => {
            setWindowSize(650, window.innerWidth);
        });
        await waitFor(() => {
            expect(result.current).toBe(SM_VALUE);
        });
    });

    it('uses largest value when above the range', async () => {
        act(() => {
            setWindowSize(2000, window.innerWidth);
        });
        await waitFor(() => {
            expect(result.current).toBe(XL_VALUE);
        });
    });
});
