# Polyratings Frontend
Frontend for the polyratings website hosted at http://polyratings.com

## Overview
The frontend was built in react do to the ease of use and do to it currently being taught at Cal Poly. The future hope is to have the website be open source and allow dedicated polyratings users to add new features and improve the user experience of the website.
## Quick Notes
* Tailwind is used for styling. For those not familiar tailwind is a css framework that allows users to write css inline using shorthand class names. This leads to generally messier markup inside components but greatly increases developer productivity. More information on tailwind can be found in the official docs [here](https://tailwindcss.com/)
* The module pattern is used throughout. In each subfolder there is a index.ts file that is used to export all of the files in the current folder. This cuts down on the amount of imports per file and keeps code more clean. In order to enforce this `../` is a restricted import pattern by default
* Currently dependency injection is used for state management (result of `mfish33` being an Angular developer) but in the future a solution such as react query could be used instead

## Folder Structure

**`/assets`** - contains static assets such as images

**`/components`** - reusable react components. One component per file. Currently nearly all css is located inside the componets so there is no need to have separate folders

**`/hooks`** - contain custom hooks that are used by the frontend. Some Notable hooks are:
* `useAuth` - returns the user if one or null otherwise
* `useService` - returns a singleton service given a service class
* `useTailwindBreakpoints` - allows js code to sync to the tailwind breakpoints making responsive design easier

**`/pages`** - Page entry points. One file per url route

**`/services`** - Holds state for the application. `injector.ts` outlines the relationships between between services and is the location to register new ones. The library used to bring this pattern into react is [mindspace-utils](https://github.com/ThomasBurleson/mindspace-utils).

**`/styles`** - holds static css files used in components or pages. These are made to be stand alone css files that are not coupled to any particular component

**`/test-utils`** - utility functions that are only relevant to be used with testing

**`/utils`** - utility functions that do not fit into any existing folder

## Testing
Jest is used for testing. Currently there is only unit tests but there is a desire to eventually have full end to end testing with something like Cyprus. If this is something that you would like to work on please take on the existing issue in the git repository.

Run tests with:
```
npm t
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
        url: "https://YOUR-DOMAIN-HERE"
    },
    base: "/",
};
```

start the dev server:
```bash
npm run start:dev
```

Building the bundle:
```bash
npm run build
```
Building the bundle outputs a stats.html that can be used to debug the bundle size
