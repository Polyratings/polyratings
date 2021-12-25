// Copyright 2021 Addison Tustin. All Rights Reserved.
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    const responseHeaders = setCorsHeaders(new Headers());
    return new Response('', { headers: responseHeaders });
  }

  const path = new URL(request.url);
  const pathParams = path.pathname.split('/');

  // return 404 if the path params do not conform to our specification
  if (pathParams.length !== 2 || pathParams[1] === '') {
    return new Response('{"error": "Resource does not exist!"}', {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const profId = pathParams[1];
  const professor = await POLYRATINGS.get(profId);

  if (professor === null)
    return new Response('{"error": "Resource does not exist!"}', {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  let headers = setCorsHeaders(new Headers());
  headers.set('Content-Type', 'application/json;charset=UTF-8');
  headers.set('Content-Encoding', 'gzip');
  headers.set('vary', 'accept-encoding');

  const init = {
    headers: headers,
    status: 200
  };

  return new Response(professor, init);
}

export function setCorsHeaders(headers: Headers): Headers {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET');
  headers.set('Access-Control-Allow-Headers', 'access-control-allow-headers');
  headers.set('Access-Control-Max-Age', '1728000');
  return headers;
}
