import { renderHook, RenderResult } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';
import { Subject } from 'rxjs';
import { useObservable } from './useObservable';

let subject: Subject<number>;
let result: RenderResult<number>;
describe('UseObservable', () => {
  beforeEach(() => {
    subject = new Subject();
    ({ result } = renderHook(() => useObservable(subject, 0)));
  });

  it('defaults to a value', () => {
    expect(result.current).toBe(0);
  });

  it('is reactive', () => {
    act(() => subject.next(2));
    expect(result.current).toBe(2);
    act(() => subject.next(4));
    expect(result.current).toBe(4);
  });
});
