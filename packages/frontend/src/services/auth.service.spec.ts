/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtAuthResponse, User } from '@polyratings/shared';
import { waitFor } from '@testing-library/dom';
import { useInjectorHook } from '@mindspace-io/react';
import { AuthService, FETCH, injectorFactory } from '.';

// JWT token with email = mfishe13@calpoly.edu
const mockToken =
  // eslint-disable-next-line max-len
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNSIsImVtYWlsIjoibWZpc2hlMTNAY2FscG9seS5lZHUiLCJpYXQiOjE1MTYyMzkwMjJ9.b45hRUjEOUSHaOUHb6yQiF5LwMmsA-GQs6Rm3-vFRu4';

let fetchFunction: (target: string, options: RequestInit) => Response;
let authService: AuthService;
describe('Auth Service', () => {
  beforeEach(() => {
    // Create a new injector each test to fully reset state
    const injector = injectorFactory();
    injector.addProviders([
      {
        provide: FETCH,
        useValue: async (target: any, init: any) => fetchFunction(target, init),
      },
    ]);
    [authService] = useInjectorHook(AuthService, injector);
  });

  it('Returns null for a user when none is present', () => {
    expect(authService.getUser()).toBeNull();
    expect(authService.getJwt()).toBeNull();
  });

  it('Attempts to login with correct credentials', async () => {
    const username = 'mfishe13';
    const password = 'test123';
    fetchFunction = (target, options) => {
      expect(target.endsWith('login')).toBeTruthy();
      const body = JSON.parse(options.body as string);
      expect(body.email).toBe(`${username}@calpoly.edu`);
      expect(body.password).toBe(password);

      const res: JwtAuthResponse = {
        accessToken: mockToken,
      };
      return new Response(JSON.stringify(res));
    };
    const user = await authService.login(username, password);
    expect(user.email).toBe('mfishe13@calpoly.edu');

    expect(authService.getJwt()).toBe(mockToken);
    expect(authService.getUser()?.email).toBe('mfishe13@calpoly.edu');
  });

  it('Removes user information after sign out', async () => {
    fetchFunction = () => {
      const res: JwtAuthResponse = {
        accessToken: mockToken,
      };
      return new Response(JSON.stringify(res));
    };
    await authService.login('mfishe13', 'test123');
    authService.signOut();
    expect(authService.getUser()).toBeNull();
    expect(authService.getJwt()).toBeNull();
  });

  it('emit\'s events correctly', async () => {
    const authStates: (User | null)[] = [];
    const subscription = authService.isAuthenticatedSubject.subscribe((authState) =>
      authStates.push(authState),
    );
    fetchFunction = () => {
      const res: JwtAuthResponse = {
        accessToken: mockToken,
      };
      return new Response(JSON.stringify(res));
    };
    const user = await authService.login('mfishe13', 'test123');
    authService.signOut();
    waitFor(() => {
      expect(authStates).toHaveLength(3);
      expect(authStates[0]).toBe(null);
      expect(authStates[1]).toEqual(user);
      expect(authStates[2]).toBe(null);
    });
    subscription.unsubscribe();
  });
});
