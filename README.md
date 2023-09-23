# Polyratings Monorepo

Lerna monorepo to contain all polyratings related code

## Packages

- [frontend](./packages/frontend/) - Frontend react app deployed at <https://polyratings.dev>
- [backend](./packages/backend/) - Backend typescript app deployed on Cloudflare Workers
- [cron](./packages/cron/) - nightly job that syncs data between environments as well as backs up the professor list to a separate git [repo](TODO://PROVIDE_URL)
- [eslint-config](./packages/eslint-config/) - shared eslint config that is enforced in all other packages

## Setup

Install top level JS dependencies

```bash
npm install
```

This will install lerna and all of the dependencies for all of the sub packages and sym link dependent packages. 


Then run:

```bash
npm run build
```

Finally:
```bash
npm run start:local
```
> Note you can run `npm run start:dev` if you have access to the cloudflare account to use data stored in the dev KV 

This will start the local hot reload server for the frontend and backend. Follow the individual package READMEs for specific package information.
