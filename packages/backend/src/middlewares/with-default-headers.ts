import { Context, MiddlewareNextFunction } from "sunder";

export async function withDefaultHeaders(ctx: Context, next: MiddlewareNextFunction) {
    await next();

    ctx.response.set("Content-Type", "application/json; charset=UTF-8");
    ctx.response.set("Access-Control-Allow-Origin", "*");
    ctx.response.set("Access-Control-Allow-Methods", "*");
    ctx.response.set("Access-Control-Allow-Headers", "*");
    ctx.response.set("Access-Control-Max-Age", "1728000");
    ctx.response.set("Content-Encoding", "gzip");
    ctx.response.set("Vary", "Accept-Encoding");
}
