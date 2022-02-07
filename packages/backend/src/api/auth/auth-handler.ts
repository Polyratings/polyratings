import { Env } from "@polyratings/backend/bindings";
import { Context } from "sunder";
import { AuthResponse, LoginRequest } from "@polyratings/shared"
import { PolyratingsError } from "@polyratings/backend/utils/errors";
import { plainToInstance } from "class-transformer";

import { AuthStrategy } from "./auth-strategy";
import { KVDAO } from '@polyratings/backend/api/dao/kv-dao';

export class AuthHandler {

    static async login(ctx: Context<Env, unknown, LoginRequest>) {
        const {username, password} = ctx.data
        const kv = new KVDAO(ctx);

        const user = await kv.getUser(username);

        const isAuthenticated = await AuthStrategy.verifyHash(user.password, password)

        if(!isAuthenticated) {
            throw new PolyratingsError(401, 'Incorrect Credentials')
        }

        const token = AuthStrategy.createToken(user)
        ctx.response.body = plainToInstance(AuthResponse, {accessToken: token})
    }

    // Convenience for registering users
    // Please disable if not in active use
    static async register(ctx: Context<Env, {secret:string}, LoginRequest>) {
        if(ctx.params.secret !== ctx.env.JWT_SIGNING_KEY) {
            throw new PolyratingsError(401, "THIS IS FOR DEVS ONLY!!!!")
        }
        const {username, password} = ctx.data
        const hash = await AuthStrategy.hashPassword(password);
        await ctx.env.POLYRATINGS_USERS.put(username, JSON.stringify({username,password:hash}))
    }
    
}