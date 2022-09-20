/* eslint-disable react/no-array-index-key */
import { getRandomSubarray } from "@/utils";
import homeHeader from "@/assets/home-header.webp";
import homeCurveTransition from "@/assets/home-curve-transition.svg";
import star from "@/assets/star.svg";
import worstOfWorstBackground from "@/assets/worst-of-worst-background.webp";
import { SearchBar, TeacherCard } from "@/components";
import { inferQueryOutput, trpc } from "@/trpc";

export function Home() {
    const { data: allProfessors } = trpc.useQuery(["allProfessors"]);

    const highlightedProfessor = getBestProfessors(allProfessors ?? [])?.[0];
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
                className="relative h-screenWoNav lg:h-screen3/5 min-h-[30rem] "
            >
                <div className="flex flex-col w-full h-2/3 lg:h-80 justify-center justify-items-center">
                    <h1 className="text-5xl md:text-9xl text-white text-center font-semibold drop-shadow-lg">
                        Polyratings
                    </h1>
                    <div className="mt-6">
                        <SearchBar showOnlyInput />
                    </div>
                </div>
                {/* Use -1 to make sure background image does not shine through bottom */}
                <img
                    src={homeCurveTransition}
                    alt="curve transition"
                    className="absolute left-0 -bottom-1 w-full lg:block hidden select-none pointer-events-none"
                />
            </div>
            <div className="justify-center pl-5 lg:flex hidden z-10 relative">
                <div className="w-1/2 transform xl:-translate-y-8 translate-y-2">
                    <h2 className="xl:text-8xl lg:text-7xl font-semibold">Class of 2022</h2>
                    <p className="xl:w-2/3 lg:w-4/5 lg:text-2xl text-xl mt-8 font-medium">
                        Congratulations on all the hard work you&apos;ve put in the last 4 years. It
                        certainly hasn&apos;t been the smooth college experience we hoped for when
                        we started years ago, but we&apos;ve made it.
                    </p>
                    <p className="xl:w-2/3 lg:w-4/5 lg:text-2xl text-xl mt-8 font-medium">
                        Good luck in your future endeavors, and have a fantastic summer!
                    </p>
                </div>

                <div
                    className="bg-cal-poly-green h-80 rounded-3xl border-8 border-black flex flex-col justify-center items-center"
                    style={{ width: "35rem" }}
                >
                    <h3 className="text-white text-5xl font-semibold text-center">
                        Featured Professor
                    </h3>
                    <div className="flex mt-2 mb-6">
                        {/* Nothing Unique about items  */}
                        {[...Array(12)].map((_, i) => (
                            <img key={i} src={star} className="h-7 w-7" alt="star" />
                        ))}
                    </div>
                    <div className="w-11/12">
                        <TeacherCard teacher={highlightedProfessor} />
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
                className="mt-8 xl:mt-16 lg:block hidden"
            >
                <h2 className="text-white font-semibold text-8xl xl:text-9xl text-center pt-40">
                    Best of the Best
                </h2>
                <div className="grid grid-cols-2 gap-y-14 m-auto mt-20 gap-x-12 xl:gap-x-24 w-[60rem] xl:w-[65rem]">
                    {bestOfTheBest.map((teacher) => (
                        <TeacherCard key={teacher.id} teacher={teacher} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function getBestProfessors(allProfessors: inferQueryOutput<"allProfessors">) {
    const rankedTeachers = allProfessors
        .filter((t) => t.numEvals > 10)
        .sort((a, b) => b.overallRating - a.overallRating);
    return getRandomSubarray(rankedTeachers.slice(0, 100), 6);
}
