import { Env } from "@polyratings/backend/bindings";
import { AuthenticatedWithBody } from "@polyratings/backend/middlewares/auth-middleware";
import { LoginRequest } from "@polyratings/shared";
import { Context } from "sunder";

export class AdminHandler {
    // TODO: Replace with real method
    static removeRating(ctx:Context<Env, unknown, AuthenticatedWithBody<LoginRequest>>) {
        console.log(ctx.data)
    }
}