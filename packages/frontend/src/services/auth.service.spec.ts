/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthResponse, UserToken } from "@polyratings/shared";
import { waitFor } from "@testing-library/dom";
import { useInjectorHook } from "@mindspace-io/react";
import { AuthService, FETCH, injectorFactory } from ".";

// JWT token with email = mfish33@calpoly.edu
const mockToken =
    // eslint-disable-next-line max-len
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZmlzaDMzIiwidXNlcm5hbWUiOiJtZmlzaDMzIiwibmJmIjoxNjQzOTEzODQ0LCJleHAiOjE2NDM5MTc0NDQsImlhdCI6MTY0MzkxMDI0NH0.UBCBPWlVjHAXpmVD-6n72GeAj-wEBc4_DM-7BqCG-8o";

let fetchFunction: (target: string, options: RequestInit) => Response;
let authService: AuthService;
describe("Auth Service", () => {
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

    it("Returns null for a user when none is present", () => {
        expect(authService.getUser()).toBeNull();
        expect(authService.getJwt()).toBeNull();
    });

    it("Attempts to login with correct credentials", async () => {
        const username = "mfish33";
        const password = "test123";
        fetchFunction = (target, options) => {
            expect(target.endsWith("login")).toBeTruthy();
            const body = JSON.parse(options.body as string);
            expect(body.username).toBe(username);
            expect(body.password).toBe(password);

            const res: AuthResponse = {
                accessToken: mockToken,
            };
            return new Response(JSON.stringify(res));
        };
        const user = await authService.login(username, password);
        expect(user.username).toBe("mfish33");

        expect(authService.getJwt()).toBe(mockToken);
        expect(authService.getUser()?.username).toBe("mfish33");
    });

    it("Removes user information after sign out", async () => {
        fetchFunction = () => {
            const res: AuthResponse = {
                accessToken: mockToken,
            };
            return new Response(JSON.stringify(res));
        };
        await authService.login("mfish33", "test123");
        authService.signOut();
        expect(authService.getUser()).toBeNull();
        expect(authService.getJwt()).toBeNull();
    });

    it("emit's events correctly", async () => {
        const authStates: (UserToken | null)[] = [];
        const subscription = authService.isAuthenticatedSubject.subscribe((authState) =>
            authStates.push(authState),
        );
        fetchFunction = () => {
            const res: AuthResponse = {
                accessToken: mockToken,
            };
            return new Response(JSON.stringify(res));
        };
        const user = await authService.login("mfish33", "test123");
        authService.signOut();
        await waitFor(() => {
            expect(authStates).toHaveLength(3);
            expect(authStates[0]).toBe(null);
            expect(authStates[1]).toEqual(user);
            expect(authStates[2]).toBe(null);
        });
        subscription.unsubscribe();
    });

    // TODO: Fix Fetch service to handle errors appropriately and work with the AuthService
    test.todo("Handle's errors returned from logging in correctly");
});
