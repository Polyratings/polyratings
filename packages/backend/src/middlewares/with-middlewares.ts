import { apply, Context, Handler } from "sunder";
import { Env } from "@polyratings/backend/bindings";
import { PathParams } from "sunder/middleware/router";

export const withMiddlewares =
    <T extends PathParams<string>, U>(...middlewares: Handler<Env, T, U>[]) =>
    (ctx: Context<Env, T>) =>
        apply(middlewares, ctx);
