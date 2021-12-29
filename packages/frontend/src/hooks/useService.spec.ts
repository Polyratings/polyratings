import { renderHook } from '@testing-library/react-hooks';
import { injector, Logger } from '@/services';
import { useService } from '.';

describe('useService', () => {
  it('retrieves teacher service', () => {
    const { result } = renderHook(() => useService(Logger));
    expect(result.current).toBeInstanceOf(Logger);
  });

  it('updates when the injector is updated', () => {
    injector.addProviders([{ provide: Logger, useValue: { changed: true } }]);
    const { result } = renderHook(() => useService(Logger));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.current as any).changed).toBe(true);
  });
});
