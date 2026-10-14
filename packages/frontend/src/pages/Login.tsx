import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import loginBackground from "@/assets/home-header.webp";
import { trpc } from "@/trpc";
import { useAuth } from "@/hooks";
import { Button } from "@/components/forms/Button";
import { TextInput } from "@/components";
import { getApiErrorMessage } from "@/utils";

const loginParser = z.object({
    username: z.string().min(1, { error: "Required" }),
    password: z.string().min(1, { error: "Required" }),
});
type LoginSchema = z.infer<typeof loginParser>;

export function Login() {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginParser),
    });

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
            void navigate("/admin");
        }
    }, [jwt, navigate, setJwt]);

    return (
        <div
            className="flex min-h-screen-wo-nav flex-col items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-8"
            style={{
                backgroundImage: `url(${loginBackground})`,
            }}
        >
            <div className="w-full max-w-[500px] p-5">
                <div id="main" className="rounded-sm bg-white p-10 shadow-lg">
                    <h2 className="mb-8 text-3xl font-bold">Sign In</h2>
                    <form onSubmit={handleSubmit((data) => login(data))}>
                        <TextInput
                            wrapperClassName="w-full!"
                            label="Username"
                            {...register("username")}
                            error={errors.username?.message}
                        />
                        <TextInput
                            wrapperClassName="w-full! mt-6 mb-8"
                            label="Password"
                            type="password"
                            {...register("password")}
                            error={errors.password?.message}
                        />
                        {networkError && (
                            <p className="text-sm text-red-500">
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
    );
}
