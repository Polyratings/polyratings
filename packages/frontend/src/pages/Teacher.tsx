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
import { departments } from "../constants/departments";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";

export function Teacher() {
    let { id } = useParams<{id:string}>();

    let [teacherData, setTeacherData] = useState<TeacherModel>({} as any)
    const history = useHistory()
    let [teacherService] = useService(TeacherService)
    let [teacherEvaluationShown, setTeacherEvaluationShown] = useState(false)
    let isAuthenticated = useAuth()

    const toggleTeacherEvaluationForm = () => {
        if(teacherEvaluationShown) {
            setTeacherEvaluationShown(false)
        } else if(isAuthenticated) {
            setTeacherEvaluationShown(true)
        } else {
            toast.info('Please Login or Register',{})
            history.push('/login')
        }
    }

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
                teacherEvaluationShown &&
                <Backdrop onClick={toggleTeacherEvaluationForm}>
                    <EvaluateTeacherForm teacher={teacherData} closeForm={toggleTeacherEvaluationForm}/>
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
                    <button onClick={toggleTeacherEvaluationForm} className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2">Evaluate Teacher</button>
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
                <div>{review.timeStamp}</div>
            </div>
            <div className="hidden lg:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0"></div>
            <div className="flex-grow">{review.text}</div>
        </div>  
    )
}

interface EvaluateTeacherFormProps {
    teacher:TeacherModel
    closeForm:() => void
}
function EvaluateTeacherForm({teacher, closeForm}:EvaluateTeacherFormProps) {

    let [knownClass, setKnownClass] = useState(teacher.classes ? teacher.classes![0].id : 0)
    let [overallRating, setOverallRating] = useState(-1)
    let [recognizesStudentDifficulties, setRecognizesStudentDifficulties] = useState(-1)
    let [presentsMaterialClearly, setPresentsMaterialClearly] = useState(-1)
    let [review, setReview] = useState('')

    const numericalRatings = [
        { label: 'Overall Rating', value:overallRating, setValue: setOverallRating},
        { label: 'Recognizes Student Difficulties:', value:recognizesStudentDifficulties, setValue: setRecognizesStudentDifficulties},
        { label: 'Presents Material Clearly', value:presentsMaterialClearly, setValue: setPresentsMaterialClearly},
    ]

    // Fix scroll position
    useEffect(() => {
        document.body.style.overflowY = "hidden"
        return () => {
            document.body.style.overflowY = "auto"
        }
    },[])
    
    return(
        <div className="p-5 bg-gray-300 opacity-100 rounded shadow cursor-default relative" style={{width:'475px'}}>
            <div className="absolute right-0 top-0 p-3 font-bold cursor-pointer" onClick={closeForm}>X</div>
            <h2 className="text-2xl font-bold">Evaluate {teacher.name}</h2>

            <h4 className="mt-4">Class</h4>
            <div className="flex justify-between mb-3">
                <select 
                    className="h-7 rounded w-40" 
                    value={knownClass} 
                    onChange={e => setKnownClass(parseInt(e.target.value))}
                >
                    {teacher.classes?.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
                    <option value="0">Other</option>
                </select>
                <div>
                    <select className="h-7 rounded" disabled={knownClass != 0}>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input className="h-7 w-16 ml-2 rounded" type="number" placeholder="class #"  disabled={knownClass != 0}/>
                </div>
            </div>
            {numericalRatings.map(rating =>
                <div className="mt-1 flex justify-between" key={rating.label}>
                    <h4>{rating.label}</h4>
                    <RatingRow value={rating.value} setValue={rating.setValue}/>
                </div>
            )}
            <h4 className="mt-2">Review:</h4>
            <textarea value={review} onChange={e => setReview(e.target.value)} className="w-full h-52 rounded"></textarea>
            <div className="flex justify-center mt-2">
                <button className="bg-cal-poly-green text-white rounded-lg p-2 shadow w-24">
                    Submit
                </button>
            </div>
        </div>
    )
}

interface RatingRowProps {
    value:number,
    setValue:(val:number) => void
}
function RatingRow({value, setValue}:RatingRowProps) {
    return(
        <div className="flex">
            {[0,1,2,3,4].map(n =>
            <label key={n} className="mr-3">
                <input 
                    type="radio"
                    className="mr-1"
                    checked={value == n}
                    onChange={e => setValue(parseInt(e.target.value))}
                    value={n}>
                </input>
                {n}
            </label>

            )}
        </div>
    )
}