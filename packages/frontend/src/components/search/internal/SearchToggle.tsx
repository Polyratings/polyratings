import { ProfessorSearchType } from "@/utils/ProfessorSearch";

interface SearchToggleProps extends React.ComponentProps<"div"> {
    searchType: ProfessorSearchType;
}

export function SearchToggle({ searchType, className = "", ...divProps }: SearchToggleProps) {
    const checked = searchType === "class";
    return (
        <div
            className={`bg-white rounded-l-full cursor-pointer ${className}`}
            {...divProps}
            role="checkbox"
            aria-checked={checked}
        >
            <div className="flex items-center relative border-cal-poly-green border-2 rounded-full h-10">
                <span
                    className={`w-28 h-10 rounded-full bg-cal-poly-green absolute left-0 transition-all ${
                        checked ? "translate-x-full" : "translate-x-0"
                    }`}
                />

                <span
                    className={`w-28 text-center select-none ${
                        checked ? "text-cal-poly-green" : "text-white"
                    } transition-all z-10`}
                >
                    Professor
                </span>
                <span
                    className={`w-28 text-center select-none ${
                        checked ? "text-white" : "text-cal-poly-green"
                    }  transition-all z-10`}
                >
                    Course
                </span>
            </div>
        </div>
    );
}
