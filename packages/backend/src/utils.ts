// TODO: Allow Post Requests and restrict header to only allow prod origin
const DEFAULT_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'access-control-allow-headers',
    'Access-Control-Max-Age': '1728000',
    'Content-Type': 'application/json; charset=UTF-8',
    'Content-Encoding': 'gzip',
    'Vary': 'Accept-Encoding'
}

export function polytatingsResponse(body: BodyInitializer, options?:ResponseInitializerDict): Response {
    const responseOptions = options || {}
    const userSetHeaders = responseOptions['headers']

    if(userSetHeaders) {
        responseOptions['headers'] = {...DEFAULT_HEADERS, ...userSetHeaders}
    } else {
        responseOptions['headers'] = DEFAULT_HEADERS
    }

    return new Response(body, responseOptions)
}
