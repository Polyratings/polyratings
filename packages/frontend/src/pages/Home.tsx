import homeHeader from '../assets/home-header.webp'
import homeCurveTransition from '../assets/home-curve-transition.svg'
import { TeacherCard } from '../components/TeacherCard'
import star from '../assets/star.svg'
import worstOfWorstBackground from '../assets/worst-of-worst-background.webp'
import { useEffect, useState } from 'react'
import { TeacherEntry } from '@polyratings-revamp/shared'
import { TeacherService } from '../services'
import { SearchBar } from '../components/SearchBar'
import { useService } from '../hooks/useService'

export function Home() {
    let [bestTeacher, setBestTeacher] = useState<TeacherEntry>({} as any)
    let [worstTeachers, setWorstTeachers] = useState<TeacherEntry[]>([])
    const[teacherService] = useService(TeacherService)

    useEffect(() => {
        async function retrieveHomeData() {
            let [bestTeacher, worstTeachers] = await Promise.all([teacherService.getRandomBestTeacher(), teacherService.getRandomWorstTeachers()])
            setBestTeacher(bestTeacher)
            setWorstTeachers(worstTeachers)
        }
        retrieveHomeData()
    }, [])

    return (
       <div>
            <div style={{
            backgroundImage:`url(${homeHeader})`,
            backgroundRepeat:'no-repeat',
            backgroundPosition:'center',
            backgroundSize: 'cover'
            }} className="relative h-screenWoNav lg:h-screen4/5">
                <div className="flex flex-col w-full h-2/3 lg:h-80 justify-center justify-items-center">
                    <h1 className="text-5xl md:text-9xl text-white text-center font-semibold">Polyratings</h1>
                    <div className="mt-6">
                        <SearchBar/>
                    </div>
                </div>
                {/* Use -1 to make sure background image does not shine through bottom */}
                <img src={homeCurveTransition} alt="curve transition" style={{bottom: -1}} className="absolute left-0 w-full lg:block hidden"/>
            </div>
            <div className="justify-center pl-5 lg:flex hidden">
                <div className="w-1/2 transform xl:-translate-y-8 translate-y-2">
                    <h2 className="xl:text-8xl lg:text-7xl font-semibold">WE’RE BACK!</h2>
                    <p className="xl:w-2/3 lg:w-4/5 lg:text-2xl text-xl mt-8 font-medium">A good teacher can make or break a class. Here at Polyratings we belive that you should not be rolling the dice when you register for a class. This version of Polyratings is a ground up rebuild of the entire website. Read more about it here</p>
                </div>

                <div className="bg-cal-poly-green h-80 rounded-3xl border-8 border-black flex flex-col justify-center items-center" style={{width:"35rem"}}>
                    <h3 className="text-white text-5xl font-semibold text-center">Featured Teacher</h3>
                    <div className="flex mt-2 mb-6">
                        {[...Array(12)].map((_, i) => <img key={i} src={star} alt="star"></img>)}
                    </div>
                    <div className="w-11/12">
                        <TeacherCard teacher={bestTeacher}/>
                    </div>
                </div>
            </div>
            <div style={{
                backgroundImage:`url(${worstOfWorstBackground})`,
                backgroundRepeat:'no-repeat',
                backgroundPosition:'center',
                backgroundSize: 'cover',
                height:'100vh',
                clipPath: 'polygon(0 100%,0 10%,100% 0,100% 100%)'
            }} className="mt-8 xl:mt-16 lg:block hidden">
                <h2 className="text-white font-semibold text-9xl text-center pt-40">Worst of the Worst</h2>
                <div className="grid grid-cols-2 gap-y-14 m-auto mt-20" style={{width:'65rem',columnGap:'6rem'}}>
                        {worstTeachers.map((teacher, i) => <TeacherCard key={i} teacher={teacher}/>)}
                </div>
            </div>
       </div>
    )
}

