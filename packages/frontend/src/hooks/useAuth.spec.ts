import { UserToken } from "@polyratings/client";
import { renderHook, RenderResult } from "@testing-library/react-hooks";
import { waitFor } from "@testing-library/dom";
import { act } from "react-dom/test-utils";
import { useService } from ".";
import { useAuth } from "./useAuth";
import { AuthService } from "@/services";

const { fetch } = global;

let result: RenderResult<UserToken | null>;
// JWT token for user mfish33
const mockToken =
    // eslint-disable-next-line max-len
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZmlzaDMzIiwidXNlcm5hbWUiOiJtZmlzaDMzIiwibmJmIjoxNjQzOTEzODQ0LCJleHAiOjE2NDM5MTc0NDQsImlhdCI6MTY0MzkxMDI0NH0.UBCBPWlVjHAXpmVD-6n72GeAj-wEBc4_DM-7BqCG-8o";

describe("UseAuth", () => {
    beforeAll(() => {
        global.fetch = async () => new Response(JSON.stringify({ accessToken: mockToken }));
    });

    afterAll(() => {
        global.fetch = fetch;
    });

    beforeEach(() => {
        ({ result } = renderHook(() => useAuth()));
    });

    it("when user is not logged in it is null", () => {
        expect(result.current).toBeNull();
    });

    it("is reactive", async () => {
        act(() => {
            const authService = useService(AuthService);
            authService.login("mfish33", "test123");
        });
        await waitFor(() => expect(result.current?.username).toBe("mfish33"));
    });
});
