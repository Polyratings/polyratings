**Note: This document is prepared under the assumption that you are storing your source code in GitHub and using Cloudflare as your cloud provider. YMMV and under any other configurations we cannot guarantee knowledge or support.**

# Preliminary Setup

## Setting Up Source Code

First you'll need somewhere to store the Polyratings source. You can either fork the [existing GitHub Repository](https://github.com/Polyratings/polyratings) or copy into your own fresh repo.

## Create Your Cloudflare Account

You can follow the the [steps here](https://support.cloudflare.com/hc/en-us/articles/201720164-Creating-a-Cloudflare-account-and-adding-a-website) to setup your Cloudflare account and either register a new domain new or transfer an existing one to Cloudflare. For all intents and purposes it **is not** necessary for you to utilize anything more than the Cloudflare [Free Tier](https://www.cloudflare.com/plans/free/) unless you wish to utilize some of the analytics or access control tools/features.

## Acquiring Access to Perspective API

Perspective API is used to perform sentiment analysis on new ratings as students enter them, and is an integral part to the operation of the site. You can follow the steps [here](https://developers.perspectiveapi.com/s/docs-get-started) to setup access. We will not be covering how to setup a Google Cloud Platform account or its associated project, but you can find that information [here.](https://console.cloud.google.com/freetrial?_ga=2.23528445.670071674.1647121117-896238666.1632636274)

# Cloudflare Workers

Setting up the different Cloudflare workers requires some manual setup (both through the Cloudflare dashboard and in the source code) and then can be finished using the available build scripts.

## Cloudflare Dashboard

### KV

[Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/) is a Key-Value store that is accessible to the Cloudflare workers during runtime. Unfortunately, these stores must be setup **before** deploying the workers and (to the best of my knowledge) cannot be done programmatically.

To setup your KVs, navigate to the "Workers" tab from the Cloudflare Dashboard, and the select the "KV" subtab. In the center-right section of the page, you'll see a "Create namespace" button, become familiar with it because you'll need to create at least 4 separate KV namespaces (or more as each deployment environment--prod/beta/dev--requires 4 unique namespaces to operate).
**Namespaces to create:**

-   `POLYRATINGS_TEACHERS_<ENV>`
-   `POLYRATINGS_RATING_QUEUE_<ENV>`
-   `POLYRATINGS_PROFESSOR_QUEUE_<ENV>`
-   `POLYRATINGS_USERS_<ENV>`
-   `POLYRATINGS_REPORTS_<ENV>`
    Take note of the namespace IDs as you'll need them for later configuration.

### Workers Usage Model

Navigate back to the "Overview" subtab and on the right side of the page, you'll see an option called "Default Usage Model" and it's probably set to "Unbound", click "Change" and set it to "Bundled."

This is mostly done because under our own testing, there are multiple times where deploying wrangler environments will not actually set the "bounded" model as specified in the configuration, and it's a pain to go back and manually set that for each worker using the Cloudflare Dashboard.

### URLS and Endpoints

You'll need to figure out what URLS you want to listen on for your backend. Our current convention is to use `api-ENVIRONMENT.DOMAIN.COM` so for the actual Polyratings site it's `api-prod.polyratings.org`.

Once you've determined the endpoints you want, you'll need to setup some DNS records that allow Cloudflare (and Workers) to redirect requests to the proper handler. To do this, navigate to the "Websites" tab, click on the domain that will be hosting your deployment, select "DNS," and click the "Add record" button to and an "AAAA" type record where "name" is the URL path before `DOMAIN.COM` (i.e. `api-prod`) then the IPv6 address should be "100::" (yes, this technically means to discard the request, but we use this to enable Cloudflare proxying on the URL path, which then triggers the routing rules we will later configure).

## Cloudflare Wrangler

The next thing you'll need to do is install [Cloudflare Wrangler](https://developers.cloudflare.com/workers/cli-wrangler/install-update/) and [authenticate](https://developers.cloudflare.com/workers/cli-wrangler/authentication/) yourself. This allows you to perform deployments from the CLI (and make use of the build scripts we have).

## Configuring the Workers

Each of the Wrangler project's ([Backend Worker](#backend-worker) or [Cron Worker](#cron-worker)) are configured using a `wrangler.toml` file that declares the different environment configurations, deployment types, etc. There are values that are specific to your Cloudflare account and **must** be changed!

If you want a better understanding of the syntax and structure of the configuration file, you can find that information [here.](https://developers.cloudflare.com/workers/cli-wrangler/configuration/) The only configurations that are unique for each person/domain/etc. are the following:

**Top Level Declarations:**

-   `zone_id` - The Cloudflare Zone that corresponds to the domain of the website (can be found on the right side of that domain's "Overview" Page)
-   `account_id` - Your Cloudflare Account

**Environment-Specific Declarations:**

-   `route` - The URL that specific environment will listen on. These are the URLS you setup in [URLS and Endpoints](#urls-and-endpoints).

### Backend Worker

In the Backend package, you'll need to modify the `kv_namespaces` field under each environment, changing the ID of each namespace to match the titles and environments of the namespaces you created in [KV](#kv).

Additionally, you're going to need to configure some [Secrets using Wrangler.](https://developers.cloudflare.com/workers/platform/environment-variables/#adding-secrets-via-wrangler) Specifically, we need to create the following secrets (they can either be the same per environment, or different so long as they are valid):

-   `PERSPECTIVE_API_KEY` - API key received when following [Preliminary Setup](#preliminary-setup)
-   `JWT_SIGNING_KEY` - @mfish33 (if you want to explain how to gen it)

#### Deploying/Publishing

After performing the above steps, you should be able to deploy the worker using wrangler:
`wrangler deploy --env ENVIRONMENT_TO_DEPLOY`

### Cron Worker

Note: You **only** need to deploy this worker if you have multiple backend environments (prod, beta, dev, etc.) and want to synchronize them daily. Otherwise you can ignore this step.

The Cron worker requires the following secrets to function:

-   `POLYRATINGS_CI_USERNAME` - The username of a user in the `POLYRATINGS_USERS` KV.
-   `POLYRATINGS_CI_PASSWORD` - The plaintext password of the user above.
-   `CLOUDFLARE_API_TOKEN` - A Cloudflare API token that has permission to access the backend workers. You can follow the steps [here](https://developers.cloudflare.com/api/tokens/create/) to generate that token.

#### Executing Deployment

After performing the above steps, you should be able to deploy the worker using wrangler:
`wrangler deploy --env ENVIRONMENT_TO_DEPLOY`

## Populating the Database

We currently provide a [daily dump](https://github.com/Polyratings/polyratings-data) of the entire Polyratings professor dataset. While we don't currently have a utility that can automatically populate an arbitrary KV with that dataset, you can use Wrangler [bulk put](https://developers.cloudflare.com/workers/cli-wrangler/commands/#put-2) functionality and upload a JSON file containing a slightly modified version of those dumps to populate your KV.

# Cloudflare Pages

As far as I am aware, there is no easy programmatic/automatic way to create a Cloudflare Pages project, so you'll need to follow the steps below to automatically build and deploy the site from source.

## Configuration (When Modifying the Backend Package)

Before we can begin deploying the frontend, we'll need to modify the URLs that it points to. From the root of the Frontend package in `src/App.config.ts`, you'll need to modify the `remoteUrl` of the various `AppConfigurations` to match the base routes you created in [URLS and Endpoints](#urls-and-endpoints): `https://api-ENV.DOMAIN.COM`

## Deploying

Navigate to the "Pages" tab from the dashboard to begin and select "Create a Project." You can select "Connect GitHub" and follow the setup process to link your new repository with Cloudflare. You'll be redirected back to Cloudflare and confirm the repository you'll be using for Cloudflare Pages by selecting "Begin setup".

### Builds and Deployments Page

You'll need to fill out the page using the following settings:

-   **Project name:** The name you want associated with this Pages project. Note: it **is not** the final URL that will point to your homepage.
-   **Production branch**: This should usually be `master` unless you've changed the default branch of your repository.
-   **Framework preset**: None
-   **Build command**: `nx build frontend`.
-   **Build output directory**: `/packages/frontend/dist`

Then select "Save and Deploy." Your site should automatically deploy to `project-name.pages.dev` though if your project name is identical to another, there will be a unique identifier appended to the end of `project-name`.
