import { createReactQueryHooks } from "@trpc/react";

// eslint-disable-next-line no-restricted-imports, import/no-relative-packages
import type { AppRouter } from "@backend/index";
import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";

export const trpc = createReactQueryHooks<AppRouter>();

export type inferQueryOutput<TRouteKey extends keyof AppRouter["_def"]["queries"]> =
    inferProcedureOutput<AppRouter["_def"]["queries"][TRouteKey]>;

export type inferQueryInput<TRouteKey extends keyof AppRouter["_def"]["queries"]> =
    inferProcedureInput<AppRouter["_def"]["queries"][TRouteKey]>;

export type inferMutationOutput<TRouteKey extends keyof AppRouter["_def"]["mutations"]> =
    inferProcedureOutput<AppRouter["_def"]["mutations"][TRouteKey]>;

export type inferMutationInput<TRouteKey extends keyof AppRouter["_def"]["mutations"]> =
    inferProcedureInput<AppRouter["_def"]["mutations"][TRouteKey]>;
