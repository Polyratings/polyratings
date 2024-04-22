import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { useState } from "react";
import { getRandomSubarray } from "@/utils";
import homeHeader from "@/assets/home-header.webp";
import homeCurveTransition from "@/assets/home-curve-transition.svg";
import homeTags from "@/assets/home-tags.svg";
import homeProfessorSummary from "@/assets/home-professor-summary.svg";
import worstOfWorstBackground from "@/assets/worst-of-worst-background.webp";
import { SearchBar, ProfessorCard, SearchState } from "@/components";
import { trpc } from "@/trpc";

export function Home() {
    const { data: allProfessors } = trpc.professors.all.useQuery();

    const bestOfTheBest = allProfessors ? getBestProfessors(allProfessors) : [];

    const [searchState, setSearchState] = useState<SearchState>({ searchValue: "", type: "name" });

    return (
        <div>
            <div
                style={{
                    backgroundImage: `url(${homeHeader})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
                className="relative h-screenWoNav lg:h-screen3/5 min-h-[30rem]"
            >
                <div className="flex flex-col w-full h-2/3 lg:h-80 justify-center justify-items-center">
                    <h1 className="text-6xl md:text-9xl 2xl:text-[9rem] text-white text-center font-semibold drop-shadow-lg">
                        Polyratings
                    </h1>
                    <div className="mt-6 2xl:mt-9">
                        <SearchBar value={searchState} onChange={setSearchState} />
                    </div>
                </div>
                <img
                    src={homeCurveTransition}
                    alt="curve transition"
                    className="absolute left-0 -bottom-7 w-full lg:block hidden select-none pointer-events-none"
                />
            </div>
            <div className="lg:block hidden">
                <div className="w-[60rem] text-center m-auto z-10 relative">
                    <p className="absolute text-6xl -left-14 hidden xl:block">🎉</p>
                    <p className="absolute text-6xl -right-14 hidden xl:block">🎉</p>
                    <h3 className="text-5xl font-bold mb-8">
                        Newest Feature: Course Accessibility!
                    </h3>
                    <p className="text-2xl font-medium mb-6">
                        We are happy to announce the release of the course accessibility allowing
                        students to add tags to ratings.
                    </p>
                </div>
                <div className="flex justify-center items-start gap-16">
                    <img
                        className="w-[35rem]"
                        src={homeTags}
                        alt="Accessability tag form to rate professors"
                    />
                    <div className="text-left w-[31rem]">
                        <img src={homeProfessorSummary} alt="Professor summary with tags" />
                        <ul className="text-xl list-[home-list] mt-4">
                            <li className="ml-7 mb-4">Select tags in Evaluation form</li>
                            <li className="ml-7">
                                Top tags will be displayed at the top of the professor page
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div
                style={{
                    backgroundImage: `url(${worstOfWorstBackground})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                    minHeight: "100vh",
                    clipPath: "polygon(0 100%,0 10%,100% 0,100% 100%)",
                }}
                className="lg:block hidden"
            >
                <h2 className="text-white font-semibold text-8xl xl:text-9xl text-center pt-40">
                    Best of the Best
                </h2>
                <div className="grid grid-cols-2 gap-y-14 m-auto mt-20 gap-x-12 xl:gap-x-24 w-[60rem] xl:w-[65rem]">
                    {bestOfTheBest.map((professor) => (
                        <ProfessorCard key={professor.id} professor={professor} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function getBestProfessors(allProfessors: inferProcedureOutput<AppRouter["professors"]["all"]>) {
    const rankedProfessors = allProfessors
        .filter((t) => t.numEvals > 10)
        .sort((a, b) => b.overallRating - a.overallRating);
    return getRandomSubarray(rankedProfessors.slice(0, 100), 6);
}
