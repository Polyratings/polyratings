import { serialize, parse } from 'cookie';

export interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    path?: string;
}

export function setCookie(
    name: string,
    value: string,
    options: CookieOptions = {}
): string {
    const {
        httpOnly = true,
        secure = true,
        sameSite = 'strict',
        maxAge,
        path = '/',
    } = options;

    return serialize(name, value, {
        httpOnly,
        secure,
        sameSite,
        maxAge,
        path,
    });
}

export function getCookie(cookieHeader: string | null, name: string): string | null {
    if (!cookieHeader) {
        return null;
    }
    
    const cookies = parse(cookieHeader);
    return cookies[name] || null;
}

export function clearCookie(name: string, path: string = '/'): string {
    return setCookie(name, '', { maxAge: 0, path });
}