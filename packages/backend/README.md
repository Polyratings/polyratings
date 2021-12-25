# Polyratings Backend
This package contains all of the code required to create the backend endpoints for the Polyratings website.

## Cloudflare Workers
This backend is written to be deployed on the [Cloudflare Workers Service](https://workers.cloudflare.com/). As such,
the available resources and globals will be restricted to those provided by the [Cloudflare Workers Runtime-API](
https://developers.cloudflare.com/workers/runtime-apis).

### Workers KV
[WorkersKV](https://developers.cloudflare.com/workers/runtime-apis/kv) is a provided runtime-api that provides a durable
key-value store that is backed by the Cloudflare Cache and distributed over the Cloudflare CDN. This API is the basis 
for the site's data-storage solution (read: this is our database).

## Building
There are two separate handlers (one 'read-handler' and another 'write-handler'). You can create their build artifacts 
individually with `npm run build:read|write` or you can build the entire project with `npm run build`.

## Testing
Testing is currently a work-in-progress as decisions are made for which testing platforms and supporting dependencies
will ultimately be adopted.

## Deployment
Currently, deployment is done manually by copy-pasting the build-artifacts directly into the Cloudflare Workers console,
it is the ultimate goal of this project to adopt automatic build, testing, and deployments to help improve the 
development process, code quality, and service stability.