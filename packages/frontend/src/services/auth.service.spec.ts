import { AuthService } from "."
import { useService } from "../hooks"

let authService:AuthService
describe('Auth Service', () => {
    beforeEach(() => {
        authService = useService(AuthService)[0]
    })

    it('Returns null for a user when none is present', () => {
        const user = authService.getUser()
        expect(user).toBeNull()
    })

    it('Returns null for the jwt when a user is not present', () => {
        const user = authService.getJwt()
        expect(user).toBeNull()
    })

})