# Polyratings Cron

Cron job that is run once a day to provide maintenance and sync prod to dev environments

## Architecture

-   worker.ts - cloudflare worker entry point
-   local.ts - local running entry point
-   entry.ts - shared entry that gets called by each specific environment file
-   steps - functions that are called by entry to do specific actions
-   wrappers - api wrappers that make interacting with cloudflare more ergonomic

## Running locally

> WARNING ZONE: Running locally still connects to production servers

Build using:

```bash
npm build:local
```

Run with:

```bash
npm run run:local
```
