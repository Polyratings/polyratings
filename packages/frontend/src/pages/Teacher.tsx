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
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";
import { EvaluateTeacherForm } from "../components/EvaluateTeacherForm";

export function Teacher() {
    let { id } = useParams<{id:string}>();

    let [teacherData, setTeacherData] = useState<TeacherModel>({} as any)
    const history = useHistory()
    let [teacherService] = useService(TeacherService)
    let [teacherEvaluationShownDesktop, setTeacherEvaluationShownDesktop] = useState(false)
    let [teacherEvaluationShownMobile, setTeacherEvaluationShownMobile] = useState(false)
    let isAuthenticated = useAuth()

    const toggleTeacherEvaluationForm = (state:boolean, setState:(value:boolean) => void) => {
        if(state) {
            setState(false)
        } else if(isAuthenticated) {
            setState(true)
        } else {
            toast.info('Please Login or Register',{})
            history.push('/login')
        }
    }

    const toggleTeacherEvaluationFormDesktop = () => toggleTeacherEvaluationForm(teacherEvaluationShownDesktop, setTeacherEvaluationShownDesktop)
    const toggleTeacherEvaluationFormMobile = () => toggleTeacherEvaluationForm(teacherEvaluationShownMobile, setTeacherEvaluationShownMobile)

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
            {
                teacherEvaluationShownDesktop &&
                <Backdrop>
                    <div className="bg-gray-300 opacity-100 rounded shadow p-5" style={{width:475}}>
                        <EvaluateTeacherForm teacher={teacherData} setTeacher={setTeacherData} closeForm={toggleTeacherEvaluationFormDesktop}/>
                    </div>
                </Backdrop>
            }

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
                    <button onClick={toggleTeacherEvaluationFormDesktop} className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2">Evaluate Teacher</button>
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
                <button 
                    onClick={toggleTeacherEvaluationFormMobile}
                    className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2"
                >
                    {teacherEvaluationShownMobile ? 'Close Evaluation' : 'Evaluate Teacher'}
                </button>
            </div>

            <div className="container lg:max-w-5xl bg-cal-poly-green h-1 mx-auto mt-2"></div>
            <AnimateHeight  duration={500} height={teacherEvaluationShownMobile ? 'auto' : 0}>
                <div className="bg-cal-poly-green text-white p-5">
                    <EvaluateTeacherForm teacher={teacherData} setTeacher={setTeacherData} closeForm={toggleTeacherEvaluationFormMobile}/>
                </div>
            </AnimateHeight>

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
            {/* Mobile class scroll needs room to see all reviews */}
            <div className="block md:hidden h-16 w-full"></div>
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
                <div>{new Date(review.createdAt).toLocaleString('en-US', {year: 'numeric', month: 'short'})}</div>
            </div>
            <div className="hidden lg:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0"></div>
            <div className="flex-grow">{review.text}</div>
        </div>  
    )
}