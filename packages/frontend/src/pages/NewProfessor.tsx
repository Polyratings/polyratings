import loginBackground from "@/assets/home-header.webp";
import { NewProfessorFormTwoStep, NewProfessorLinear } from "@/components";

export function NewProfessor() {
    return (
        <div>
            <div
                className="h-screenWoNav hidden min-h-[55rem] items-center justify-center sm:flex"
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
            <div className="min-h-screenWoNav flex justify-center bg-gray-300 sm:hidden">
                <NewProfessorLinear />
            </div>
        </div>
    );
}
