# Polyratings Backend

This package contains the source code required to run the backend for the Polyratings service.

## Cloudflare Workers

This backend was written to be deployed on the [Cloudflare Workers Service](https://workers.cloudflare.com/).
As such, the available resources and globals will be restricted to those provided by the
[Cloudflare Workers Runtime API](https://developers.cloudflare.com/workers/runtime-apis).

### Workers KV

[WorkersKV](https://developers.cloudflare.com/workers/runtime-apis/kv) is a provided runtime api that provides
access to a durable key-value storage that is backed by the Cloudflare Cache and CDN. This API is the basis for
the site's data-storage solution, primarily for its low-cost and speed.

## Architecture

The backend begins with a single entrypoint in [index.ts](src/index.ts) that sets up the trpc router and surrounding logic

-   routers - provide handlers for each module professors, ratings, admin and auth

-   dao (Data Access Object) - provide an abstraction layer over the data and allow request handlers to have a nice api surface. This includes all interactions with kv. For example adding/removing professors or reviews

-   generated - contains generated config files that are consumed by the cron job. These files are just a typescript file that represents the wrangler.toml file. These files are generated whenever the build command is called

-   types - contains kv schema along with supporting type helpers

## Building

To build this package, you simply need to run `npm run build` and [esbuild](https://esbuild.github.io/) will
bundle the entire project and its dependencies together. The build artifact from this process can be manually uploaded
to Cloudflare Workers.

## Testing

Automated testing is currently a work-in-progress as we are working on this project. It is our full intention to completely
automate the building, testing, and deployment of this project within some type of CI/CD orchestration.

## Deployment

This package makes use of [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler) a Command-line Interface
provided by Cloudflare which can automatically build and deploy your workers project to the Cloudflare network.

After downloading the CLI tool and authenticating with it, you can simply run `npm run deploy:ENV_NAME` to deploy
a live version of your code for testing, production, etc.
