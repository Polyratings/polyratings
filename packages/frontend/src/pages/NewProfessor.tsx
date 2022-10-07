import loginBackground from "@/assets/home-header.webp";
import { NewProfessorForm } from "@/components";

export function NewProfessor() {
    return (
        <div>
            <div
                className="h-screenWoNav min-h-[55rem] justify-center items-center hidden sm:flex"
                style={{
                    backgroundImage: `url(${loginBackground})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
            >
                <div className="shadow">
                    <NewProfessorForm />
                </div>
            </div>
            <div className="sm:hidden flex justify-center bg-gray-300 min-h-screenWoNav">
                <NewProfessorForm />
            </div>
        </div>
    );
}
