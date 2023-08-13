# Polyratings Frontend

Frontend for the polyratings website hosted at <http://polyratings.dev>

## Overview

The frontend was built in react do to the ease of use and do to it currently being taught at Cal Poly.

## Quick Notes

-   Tailwind is used for styling. For those not familiar tailwind is a css framework that allows users to write css inline using shorthand class names. This leads to generally messier markup inside components but greatly increases developer productivity. More information on tailwind can be found in the official docs [here](https://tailwindcss.com/)
-   The module pattern is used throughout. In each subfolder there is a index.ts file that is used to export all of the files in the current folder. This cuts down on the amount of imports per file and keeps code more clean. In order to enforce this `../` is a restricted import pattern by default
-   Trpc is used for communication between the frontend and backend. It provides typesafe interactions and is built on top of tanstack query. To learn more about either you can visit <https://trpc.io/> and <https://tanstack.com/query/v4>

## Folder Structure

**`/assets`** - contains static assets such as images

**`/components`** - reusable react components. One public component per file. Currently nearly all css is located inside the components so there is no need to have separate folders

**`/hooks`** - contain custom hooks that are used by the frontend. Some Notable hooks are:

-   `useAuth` - returns the user if one or null otherwise
-   `useTailwindBreakpoints` - allows js code to sync to the tailwind breakpoints making responsive design easier
-   `useLocationState` - Similar to use state but is restored if a page is returned to on a navigation event

**`/pages`** - Page entry points. One file per url route

**`/styles`** - holds static css files used in components or pages. These are made to be stand alone css files that are not coupled to any particular component

**`/test-utils`** - utility functions that are only relevant to be used with testing

**`/utils`** - utility functions that do not fit into any existing folder

## Testing

Vitest is used for testing. Currently there is only unit tests but there is a desire to eventually have full end to end testing with something like Cyprus or Playwright. If this is something that you would like to work on please take on the existing issue in the git repository.

Run tests with:

```bash
nx test frontend
```

## Developing locally

First, complete the global setup instructions located [here](../../README.md/#setup). If you are not using the default dev backend, configure it in `App.config.ts`.

Change the remote url to a custom dev domain

```ts
// From
const devConfig: AppConfiguration = {
    clientEnv: DEV_ENV,
    base: "/",
};

// To
const devConfig: AppConfiguration = {
    clientEnv: {
        url: "https://YOUR-DOMAIN-HERE",
    },
    base: "/",
};
```

start the dev server:

```bash
nx serve frontend
```

Building the bundle:

```bash
nx build frontend
```

Building the bundle outputs a stats.html that can be used to debug the bundle size
