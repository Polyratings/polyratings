import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import loginBackground from "@/assets/home-header.webp";
import { trpc } from "@/trpc";
import { useAuth } from "@/hooks";
import { Button } from "@/components/forms/Button";
import { TextInput } from "@/components";

const loginParser = z.object({
    username: z.string().min(1, { message: "Required" }),
    password: z.string().min(1, { message: "Required" }),
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

    const { mutateAsync: login, data: jwt, error: networkError } = trpc.auth.login.useMutation();

    useEffect(() => {
        if (jwt) {
            setJwt(jwt);
            navigate("/admin");
        }
    }, [jwt]);

    return (
        <div
            className="flex h-screenWoNav items-center justify-center"
            style={{
                backgroundImage: `url(${loginBackground})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "cover",
            }}
        >
            <div className="transform p-5 md:-translate-y-1/4" style={{ width: "500px" }}>
                <div id="main" className="rounded bg-white p-10 shadow-lg">
                    <h2 className="mb-8 text-3xl font-bold">Sign In</h2>
                    <form onSubmit={handleSubmit((data) => login(data))}>
                        <TextInput
                            wrapperClassName="!w-full"
                            label="Username"
                            {...register("username")}
                            error={errors.username?.message}
                        />
                        <TextInput
                            wrapperClassName="!w-full mt-6 mb-8"
                            label="Password"
                            type="password"
                            {...register("password")}
                            error={errors.password?.message}
                        />
                        {networkError && (
                            <p className="text-sm text-red-500">{networkError.message}</p>
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
