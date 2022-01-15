export function setCorsHeaders(headers: Headers): Headers {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET');
    headers.set('Access-Control-Allow-Headers', 'access-control-allow-headers');
    headers.set('Access-Control-Max-Age', '1728000');
    return headers;
}
