import { t } from "@polyratings/backend/trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { professorRouter } from "./professor";
import { ratingsRouter } from "./rating";

export const appRouter = t.mergeRouters(professorRouter, ratingsRouter, adminRouter, authRouter);
