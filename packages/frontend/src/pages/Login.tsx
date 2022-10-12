import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
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

    const [, setJwt] = useAuth();
    const navigate = useNavigate();

    const { mutate: login, error: networkError } = trpc.auth.login.useMutation({
        onSuccess: (jwt) => {
            setJwt(jwt);
            navigate("/admin");
        },
    });

    return (
        <div
            className="h-screenWoNav flex justify-center items-center"
            style={{
                backgroundImage: `url(${loginBackground})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "cover",
            }}
        >
            <div className="p-5 transform md:-translate-y-1/4" style={{ width: "500px" }}>
                <div id="main" className="bg-white shadow-lg rounded p-10">
                    <h2 className="text-3xl font-bold mb-8">Sign In</h2>
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
                        {networkError && <p className="text-red-500 text-sm">{networkError}</p>}
                        <Button className="w-full" type="submit">
                            Continue
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
