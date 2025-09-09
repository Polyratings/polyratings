export interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
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
        sameSite = 'Strict',
        maxAge,
        path = '/',
    } = options;

    let cookie = `${name}=${value}; Path=${path}`;
    
    if (httpOnly) {
        cookie += '; HttpOnly';
    }
    
    if (secure) {
        cookie += '; Secure';
    }
    
    if (sameSite) {
        cookie += `; SameSite=${sameSite}`;
    }
    
    if (maxAge !== undefined) {
        cookie += `; Max-Age=${maxAge}`;
    }
    
    return cookie;
}

export function getCookie(cookieHeader: string | null, name: string): string | null {
    if (!cookieHeader) {
        return null;
    }
    
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return cookieValue || null;
        }
    }
    
    return null;
}

export function clearCookie(name: string, path: string = '/'): string {
    return setCookie(name, '', { maxAge: 0, path });
}