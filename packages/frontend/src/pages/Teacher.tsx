import { useState, useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Class } from '../models/Class'
import { Teacher as TeacherModel } from "../models/Teacher";
import { TeacherService } from "../services";
import AnimateHeight from 'react-animate-height';
import AnchorLink from 'react-anchor-link-smooth-scroll'
import StarRatings from 'react-star-ratings';
import { Review } from "../models/Review";
import { useService } from "../hooks/useService";
import { Backdrop } from '../components/Backdrop'

export function Teacher() {
    let { id } = useParams<{id:string}>();

    let [teacherData, setTeacherData] = useState<TeacherModel>({} as any)
    const history = useHistory()
    let [teacherService] = useService(TeacherService)

    useEffect(() => {
        async function retrieveTeacherData() {
            try {
                const result = await teacherService.getTeacher(id)
                setTeacherData(result)
            } catch(e) {
                console.error(`Failed to load teacher with id: ${id}`,e)
                history.push('/')
            }
            
        }
        retrieveTeacherData()
    }, [])

    const ClassScroll = ({outerClassName, innerClassName}: {outerClassName:string, innerClassName:string}) => (
        <div className={outerClassName}>
            {
                teacherData.classes && 
                teacherData.classes.map(
                    taughtClass => <AnchorLink 
                        key={taughtClass.id} 
                        href={`#${taughtClass.name}`} 
                        className={innerClassName}
                    >{taughtClass.name}</AnchorLink>
                )
            }
        </div>
    )

    return(
        <div>
            {/* <EvaluateTeacherForm teacher={teacherData}/> */}
            <div className="container lg:max-w-5xl mx-auto hidden sm:flex justify-between py-2">
                <div>
                    <h2 className="text-4xl text-cal-poly-green">{teacherData.name}</h2>
                    <div>
                        <StarRatings
                            rating={teacherData.overallRating}
                            starRatedColor="#BD8B13"
                            numberOfStars={4}
                            starDimension="25px"
                            starSpacing="5px "
                        />
                    </div>
                    {/* <p>{teacherData.department}</p> */}
                    <button onClick={() => {}} className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2">Evaluate Teacher</button>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl text-cal-poly-green">{teacherData.overallRating} / 4.00</h2>
                    <p>{teacherData.numberOfEvaluations} evaluations</p>
                    <p>Recognizes Student Difficulties: {teacherData.recognizesStudentDifficulties}</p>
                    <p>Presents Material Clearly: {teacherData.presentsMaterialClearly}</p>
                </div>
            </div>

            <div className="sm:hidden container py-2 text-center">
                <h2 className="text-4xl text-cal-poly-green">{teacherData.name}</h2>
                <p>{teacherData.department}</p>
                <p>Overall Rating: {teacherData.overallRating} / 4.00</p>
                <p>Recognizes Student Difficulties: {teacherData.recognizesStudentDifficulties}</p>
                <p>Presents Material Clearly: {teacherData.presentsMaterialClearly}</p>
            </div>
            <div className="container lg:max-w-5xl bg-cal-poly-green h-1 mx-auto my-2"></div>

            {
                teacherData.classes &&
                teacherData.classes.map(
                    taughtClass => <ClassSection key={taughtClass.id} id={taughtClass.name} taughtClass={taughtClass}/>
                )
            }
            <ClassScroll 
                outerClassName="hidden xl:flex flex-col fixed ml-4 top-1/2 transform -translate-y-1/2 max-h-10/12 overflow-y-auto" 
                innerClassName="text-cal-poly-green text-lg font-semibold mt-2"
            />
            <ClassScroll 
                outerClassName="flex items-center md:hidden h-14 fixed bg-cal-poly-green w-full bottom-0 overflow-x-auto scrollbar-hidden" 
                innerClassName="text-md font-semibold h-8 bg-cal-poly-gold text-white ml-4 rounded-xl py-1 px-2 whitespace-nowrap"
            />
        </div>
    )
}


function ClassSection({taughtClass, id}:{taughtClass:Class, id:string}) {
    let [expanded, setExpanded] = useState(false)
    const UNEXPANDED_LIMIT = 2
    const unexpandedReviews = taughtClass.reviews.slice(0, UNEXPANDED_LIMIT)
    const expandedReviews = taughtClass.reviews.slice(UNEXPANDED_LIMIT)
    return (
        <div className="pt-4" id={id}>
            <h2 className="text-center text-4xl text-cal-poly-green">{taughtClass.name}</h2>
            <div className="container lg:max-w-5xl flex flex-col m-auto">
                {unexpandedReviews.map(review => <ReviewCard key={review.id} review={review}/>)}
            </div>
            <AnimateHeight duration={500} height={expanded ? 'auto' : 0}>
                <div className="container lg:max-w-5xl flex flex-col m-auto">
                    {expandedReviews.map(review => <ReviewCard key={review.id} review={review}/>)}
                </div>
            </AnimateHeight>
            {
                taughtClass.reviews.length > UNEXPANDED_LIMIT &&
                <div className="flex justify-center">
                    <button onClick={() => setExpanded(!expanded)} className="bg-cal-poly-green text-white rounded-lg p-2 shadow">
                        {!expanded && "Show More"} {expanded && "Show Less"}
                    </button>
                </div>
                
            }
            
        </div>

    )
}


function ReviewCard({review}:{review:Review}) {
    return(
        <div 
            className="bg-white w-full rounded-3xl py-2 px-4 my-2 border-cal-poly-gold border-4 flex"
            key={review.id}
        >
            <div className="hidden lg:flex flex-col w-32 flex-shrink-0 m-auto mr-4 text-center text-sm">
                <div>{review.year}</div>
                <div>{review.grade}</div>
                <div>{review.reasonForTaking}</div>
                <div>{review.timeStamp}</div>
            </div>
            <div className="hidden lg:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0"></div>
            <div className="flex-grow">{review.text}</div>
        </div>  
    )
}

function EvaluateTeacherForm({teacher}:{teacher:TeacherModel}) {

    // Fix scroll position
    useEffect(() => {
        document.body.style.overflowY = "hidden"
        return () => {
            document.body.style.overflowY = "auto"
        }
    },[])
    
    return(
        <Backdrop onClick={()=>{}}>
            <div className="p-5 bg-gray-100 opacity-100 rounded shadow" style={{width:'500px'}}>
                <h2 className="text-xl font-bold">Evaluate {teacher.name}</h2>
            </div>
        </Backdrop>
    )
}