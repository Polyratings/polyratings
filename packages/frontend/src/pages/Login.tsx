import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import loginBackground from "@/assets/home-header.webp";
import { trpc } from "@/trpc";
import { useAuth } from "@/hooks";
import { Button, PageMeta, TextInput } from "@/components";
import { formError, formErrors, getApiErrorMessage, withClearErrorOnChange } from "@/utils";

const loginParser = z.object({
    username: z.string().trim().min(1, formError(formErrors.username)),
    password: z.string().min(1, formError(formErrors.password)),
});
type LoginSchema = z.infer<typeof loginParser>;

export function Login() {
    const {
        register,
        clearErrors,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginParser),
        reValidateMode: "onSubmit",
    });
    const registerField = withClearErrorOnChange(register, clearErrors);

    const { setJwt } = useAuth();
    const navigate = useNavigate();

    const {
        mutateAsync: login,
        data: jwt,
        error: networkError,
    } = trpc.auth.login.useMutation({
        // Keep login errors inline in the form instead of global toasts.
        meta: { suppressGlobalErrorToast: true },
    });

    useEffect(() => {
        if (jwt) {
            setJwt(jwt);
            navigate("/admin");
        }
    }, [jwt]);

    return (
        <div
            className="flex min-h-full flex-col bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: `url(${loginBackground})`,
            }}
        >
            <PageMeta
                title="Sign in"
                description="Sign in to the Polyratings admin tools."
                path="/login"
                noindex
            />
            {/* Scrim: the campus photo is bright enough to fight the dark card. */}
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 dark:bg-black/55">
                <div className="w-full max-w-[500px] p-5">
                    <div
                        id="main"
                        tabIndex={-1}
                        className="rounded-xl bg-card p-6 shadow-lg ring-1 ring-accent/40 outline-none sm:p-10"
                    >
                        <h2 className="mb-8 text-3xl font-bold tracking-tight">Sign In</h2>
                        <form onSubmit={handleSubmit((data) => login(data))}>
                            <TextInput
                                wrapperClassName="w-full!"
                                label="Username"
                                {...registerField("username")}
                                error={errors.username?.message}
                            />
                            <TextInput
                                wrapperClassName="w-full! mt-6 mb-8"
                                label="Password"
                                type="password"
                                {...registerField("password")}
                                error={errors.password?.message}
                            />
                            {networkError && (
                                <p className="text-red-500 text-sm">
                                    {getApiErrorMessage(
                                        networkError,
                                        "Sign-in failed. Please check your username and password.",
                                    )}
                                </p>
                            )}
                            <Button className="w-full" type="submit">
                                Continue
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
