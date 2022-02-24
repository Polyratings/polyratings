import { Router } from "sunder";
import { Env } from "@polyratings/backend/bindings";
import { ProfessorHandler } from "@polyratings/backend/api/professors/professor-handler";
import { withValidatedBody } from "@polyratings/backend/middlewares/with-validated-body";
import {
    AddProfessorRequest,
    AddReviewRequest,
    LoginRequest,
    ProfessorKeyList,
} from "@polyratings/shared";
import { RatingHandler } from "@polyratings/backend/api/ratings/rating-handler";
import { withMiddlewares } from "@polyratings/backend/middlewares/with-middlewares";
import { withAuth } from "@polyratings/backend/middlewares/auth-middleware";
import { AuthHandler } from "./auth/auth-handler";
import { AdminHandler } from "./admin/admin-handler";

export function registerRoutes(router: Router<Env>) {
    router.get("/professors", ProfessorHandler.getProfessorList);
    router.post(
        "/professors",
        withMiddlewares(withValidatedBody(AddProfessorRequest), ProfessorHandler.addNewProfessor),
    );

    router.get("/professors/:id", ProfessorHandler.getSingleProfessor);

    router.post(
        "/professors/:id/ratings",
        withMiddlewares(withValidatedBody(AddReviewRequest), RatingHandler.addNewRating),
    );
    router.get("/ratings/:id", RatingHandler.processRating);

    router.post("/login", withMiddlewares(withValidatedBody(LoginRequest), AuthHandler.login));

    router.post(
        "/register",
        withMiddlewares(withValidatedBody(LoginRequest, true), withAuth, AuthHandler.register),
    );

    router.delete(
        "/admin/rating",
        withMiddlewares(withValidatedBody(LoginRequest, true), withAuth, AdminHandler.removeRating),
    );

    router.get("/admin/pending", withMiddlewares(withAuth, AdminHandler.pendingProfessors));

    router.post(
        "/admin/pending/:id",
        withMiddlewares(withAuth, AdminHandler.approvePendingTeacher),
    );

    router.delete(
        "/admin/pending/:id",
        withMiddlewares(withAuth, AdminHandler.rejectPendingTeacher),
    );

    router.delete("/admin/professor/:id", withMiddlewares(withAuth, AdminHandler.removeProfessor));

    router.get("/admin/professor/keys", withMiddlewares(withAuth, AdminHandler.getProfessorKeys));

    router.post(
        "/admin/professor/values",
        withMiddlewares(
            withValidatedBody(ProfessorKeyList, true),
            withAuth,
            AdminHandler.getProfessorValues,
        ),
    );

    // no-op catch-all (which also applies generic OPTIONS headers)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    router.options("*", () => {});

    router.all("*", (ctx) => {
        ctx.response.status = 404;
        ctx.response.statusText = "Route not found!";
    });
}
