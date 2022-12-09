import { createTRPCReact } from "@trpc/react-query";

// eslint-disable-next-line no-restricted-imports, import/no-relative-packages
import type { AppRouter } from "@backend/index";

export const trpc = createTRPCReact<AppRouter>();
