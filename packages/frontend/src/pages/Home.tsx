import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { getRandomSubarray } from "@/utils";
import homeHeader from "@/assets/home-header.webp";
import homeCurveTransition from "@/assets/home-curve-transition.svg";
import homeTags from "@/assets/home-tags.svg";
import homeProfessorSummary from "@/assets/home-professor-summary.svg";
import worstOfWorstBackground from "@/assets/worst-of-worst-background.webp";
import { SearchBar, ProfessorCard } from "@/components";
import { trpc } from "@/trpc";

export function Home() {
    const { data: allProfessors } = trpc.professors.all.useQuery();

    const bestOfTheBest = allProfessors ? getBestProfessors(allProfessors) : [];

    return (
        <div>
            <div
                style={{
                    backgroundImage: `url(${homeHeader})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                }}
                className="relative h-screenWoNav min-h-[30rem] lg:h-screen3/5"
            >
                <div className="flex h-2/3 w-full flex-col justify-center justify-items-center lg:h-80">
                    <h1 className="text-center text-6xl font-semibold text-white drop-shadow-lg md:text-9xl">
                        Polyratings
                    </h1>
                    <div className="mt-6">
                        <SearchBar showOnlyInput />
                    </div>
                </div>
                <img
                    src={homeCurveTransition}
                    alt="curve transition"
                    className="pointer-events-none absolute left-0 -bottom-7 hidden w-full select-none lg:block"
                />
            </div>
            <div className="hidden lg:block">
                <div className="relative z-10 m-auto w-[60rem] text-center">
                    <p className="absolute -left-14 hidden text-6xl xl:block">🎉</p>
                    <p className="absolute -right-14 hidden text-6xl xl:block">🎉</p>
                    <h3 className="mb-8 text-5xl font-bold">
                        Newest Feature: Course Accessibility!
                    </h3>
                    <p className="mb-6 text-2xl font-medium">
                        We are happy to announce the release of the course accessibility allowing
                        students to add tags to ratings.
                    </p>
                </div>
                <div className="flex items-start justify-center gap-16">
                    <img
                        className="w-[35rem]"
                        src={homeTags}
                        alt="Accessability tag form to rate professors"
                    />
                    <div className="w-[31rem] text-left">
                        <img src={homeProfessorSummary} alt="Professor summary with tags" />
                        <ul className="mt-4 list-[home-list] text-xl">
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
                className="hidden lg:block"
            >
                <h2 className="pt-40 text-center text-8xl font-semibold text-white xl:text-9xl">
                    Best of the Best
                </h2>
                <div className="m-auto mt-20 grid w-[60rem] grid-cols-2 gap-y-14 gap-x-12 xl:w-[65rem] xl:gap-x-24">
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
