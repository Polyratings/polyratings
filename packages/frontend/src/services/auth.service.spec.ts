import { UserToken } from "@polyratings/client";
import { waitFor } from "@testing-library/dom";
import { useInjectorHook } from "@mindspace-io/react";
import { AuthService, CLIENT, injectorFactory } from ".";

// JWT token with email = mfish33@calpoly.edu
const mockToken =
    // eslint-disable-next-line max-len
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZmlzaDMzIiwidXNlcm5hbWUiOiJtZmlzaDMzIiwibmJmIjoxNjQzOTEzODQ0LCJleHAiOjE2NDM5MTc0NDQsImlhdCI6MTY0MzkxMDI0NH0.UBCBPWlVjHAXpmVD-6n72GeAj-wEBc4_DM-7BqCG-8o";

const clientMock = {
    setErrorInterceptor() {},
    auth: {
        token: null as string | null,
        async login() {
            this.token = mockToken;
            return {
                accessToken: mockToken,
            };
        },
        async signOut() {
            this.token = null;
        },
        getJwt() {
            return this.token;
        },
    },
};
let authService: AuthService;
describe("Auth Service", () => {
    beforeEach(() => {
        // Create a new injector each test to fully reset state
        const injector = injectorFactory();
        injector.addProviders([
            {
                provide: CLIENT,
                useValue: clientMock,
            },
        ]);
        [authService] = useInjectorHook(AuthService, injector);
    });

    it("Returns null for a user when none is present", () => {
        expect(authService.getUser()).toBeNull();
    });

    it("Removes user information after sign out", async () => {
        await authService.login("mfish33", "test123");
        authService.signOut();
        expect(authService.getUser()).toBeNull();
    });

    it("emit's events correctly", async () => {
        const authStates: (UserToken | null)[] = [];
        const subscription = authService.user$.subscribe((authState) => authStates.push(authState));
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
