# Polyratings Monorepo

Nx monorepo to contain all polyratings related code

## Packages

- [frontend](./packages/frontend/) - Frontend react app deployed at <https://polyratings.dev>
- [backend](./packages/backend/) - Backend typescript app deployed on Cloudflare Workers
- [cron](./packages/cron/) - nightly job that syncs data between environments as well as backs up the professor list to a separate git [repo](TODO://PROVIDE_URL)
- [eslint-config](./packages/eslint-config/) - shared eslint config that is enforced in all other packages

## Getting Ready for development

If you are not interested in developing the backend or cron packages you can skip to [setup](#setup)

In order to set up for development you have one of two options:

1. Following the instructions [here](./docs/deployment.md) to deploy polyratings to your personal cloudflare account. This will then allow you to do test deployments of your changes in an isolated environment.
2. Reaching out to `user@domain.com` to receive credentials to the cloudflare account in order to be able to publish to the official dev environment. This option should only be taken if you are interested in working on polyratings in the long term and have demonstrated an interest through multiple previous code contributions.

## Setup

Since this repository is organized using Nx setup is a little different than standard js projects.

Install top level JS dependencies

```bash
npm install
```

This will install all of the dependencies for all of the sub packages and sym link dependent packages. Finally run:

```bash
nx run-many -t build
```

This will build all of the projects and put shared files where they are supposed to be.

You can now start developing in your desired package. Follow the README in the specific package for specific information.
