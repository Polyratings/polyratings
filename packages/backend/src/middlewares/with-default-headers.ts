import { Context, MiddlewareNextFunction } from 'sunder';

export async function withDefaultHeaders(ctx: Context, next: MiddlewareNextFunction) {
    ctx.response.set('Access-Control-Allow-Origin', '*');
    ctx.response.set('Access-Control-Allow-Methods', 'GET');
    ctx.response.set('Access-Control-Allow-Headers', 'access-control-allow-headers');
    ctx.response.set('Access-Control-Max-Age', '1728000');
    ctx.response.set('Content-Encoding', 'gzip');
    ctx.response.set('Vary', 'Accept-Encoding');

    await next();
    
    // Override default sunder content type detection
    // All data leaving the backend WILL be of type JSON
    ctx.response.set('Content-Type', 'application/json; charset=UTF-8');
}