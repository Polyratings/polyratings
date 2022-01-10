import { UndoChanges } from '@mindspace-io/react';
import { User } from '@polyratings/shared';
import { renderHook, RenderResult } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/dom';
import { act } from 'react-dom/test-utils';
import { useService } from '.';
import { useAuth } from './useAuth';
import { AuthService, FETCH, injector } from '@/services';

let result: RenderResult<User | null>;

// JWT token with email = mfishe13@calpoly.edu
const mockToken =
  // eslint-disable-next-line max-len
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNSIsImVtYWlsIjoibWZpc2hlMTNAY2FscG9seS5lZHUiLCJpYXQiOjE1MTYyMzkwMjJ9.b45hRUjEOUSHaOUHb6yQiF5LwMmsA-GQs6Rm3-vFRu4';


let undoChanges:UndoChanges
describe('UseAuth', () => {
    beforeAll(() => {
        undoChanges = injector.addProviders([
            {
                provide: FETCH, 
                useValue: () => new Response(JSON.stringify({ accessToken: mockToken}))
            }
        ])
    })

    afterAll(() => undoChanges())

    beforeEach(() => {
        ({ result } = renderHook(() => useAuth()));
    });

    it('when user is not logged in it is null', () => {
        expect(result.current).toBeNull();
    });

    it('is reactive', async () => {
        act(() => {
            const authService = useService(AuthService)
            authService.login('mfishe13', 'test123')
        });
        await waitFor(() => expect(result.current?.email).toBe('mfishe13@calpoly.edu'))   
    });
});
