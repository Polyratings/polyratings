import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHistory } from "react-router-dom";
import loginBackground from "@/assets/home-header.webp";
import { trpc } from "@/trpc";
import { useAuth } from "@/hooks";

const loginValidator = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});
type LoginSchema = z.infer<typeof loginValidator>;

export function Login() {
    const { register, handleSubmit } = useForm<LoginSchema>({
        resolver: zodResolver(loginValidator),
    });
    const { mutate: login, error, data: jwt } = trpc.useMutation("login");
    const [, setJwt] = useAuth();

    const history = useHistory();

    if (jwt) {
        setJwt(jwt);
        history.push("/admin");
    }

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
                <div className="bg-white shadow-lg rounded p-10">
                    <h2 className="text-3xl font-bold mb-6">Sign In</h2>
                    <form onSubmit={handleSubmit((data) => login(data))}>
                        <h3 className="font-semibold">Username</h3>
                        <div className="h-10 mb-8 flex">
                            <input
                                type="text"
                                placeholder="Username"
                                className="border-gray-300 border w-full rounded-l h-full pl-2"
                                {...register("username")}
                            />
                        </div>
                        <h3 className="font-semibold">Password</h3>
                        <div className="mb-8">
                            <input
                                type="password"
                                placeholder="Password"
                                className="h-10 border-gray-300 border w-full rounded pl-2"
                                {...register("password")}
                            />
                            <p className="text-red-600">{error?.message}</p>
                        </div>
                        <button
                            className="w-full h-11 rounded bg-cal-poly-green text-white"
                            type="submit"
                        >
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
