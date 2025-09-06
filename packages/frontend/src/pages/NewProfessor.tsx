import loginBackground from "@/assets/home-header.webp";
import { NewProfessorFormTwoStep, NewProfessorLinear } from "@/components";

export function NewProfessor() {
    return (
        <div>
            <div
                className="h-screen-wo-nav min-h-220 justify-center items-center hidden sm:flex"
                style={{
                    backgroundImage: `url(${loginBackground})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
            >
                <div className="shadow">
                    <NewProfessorFormTwoStep />
                </div>
            </div>
            <div className="sm:hidden flex justify-center bg-gray-300 min-h-screen-wo-nav">
                <NewProfessorLinear />
            </div>
        </div>
    );
}
