import { useState, useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Class } from '../models/Class'
import { Teacher as TeacherModel } from "../models/Teacher";
import { TeacherService } from "../services";
import AnimateHeight from 'react-animate-height';
import AnchorLink from 'react-anchor-link-smooth-scroll'
import StarRatings from 'react-star-ratings';
import { Review, ReviewUpload } from "../models/Review";
import { useService } from "../hooks/useService";
import { Backdrop } from '../components/Backdrop'
import { departments } from "../constants/departments";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";
import { useForm, SubmitHandler, FieldErrors} from "react-hook-form";
import { ErrorMessage } from '@hookform/error-message'
import { ReviewService } from "../services";

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
                    <EvaluateTeacherForm teacher={teacherData} setTeacher={setTeacherData} closeForm={toggleTeacherEvaluationForm}/>
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
                <button onClick={toggleTeacherEvaluationForm} className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2">Evaluate Teacher</button>
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
                <div>{new Date(review.createdAt).toLocaleString('en-US', {year: 'numeric', month: 'short'})}</div>
            </div>
            <div className="hidden lg:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0"></div>
            <div className="flex-grow">{review.text}</div>
        </div>  
    )
}

interface EvaluateTeacherFormProps {
    teacher:TeacherModel
    setTeacher:(teacher:TeacherModel) => void
    closeForm:() => void
}
function EvaluateTeacherForm({teacher, setTeacher, closeForm}:EvaluateTeacherFormProps) {

    type Inputs = {
        knownClass:string
        overallRating:number
        recognizesStudentDifficulties:number
        presentsMaterialClearly:number
        reviewText:string
        unknownClassDepartment:string
        unknownClassNumber:number
        year:string
        grade:string
        reasonForTaking:string
    }

    const { register, handleSubmit, watch, formState: { errors } } = useForm<Inputs>();
    const knownClassValue = watch('knownClass')
    const [reviewService] = useService(ReviewService)
    const [networkErrorText, setNetworkErrorText] = useState('')
    const onSubmit: SubmitHandler<Inputs> = async formResult => {
        const newReview:ReviewUpload = {
            overallRating:formResult.overallRating,
            recognizesStudentDifficulties:formResult.recognizesStudentDifficulties,
            presentsMaterialClearly:formResult.presentsMaterialClearly,
            teacherId:teacher.id,
            classIdOrName: formResult.knownClass || `${formResult.unknownClassDepartment} ${formResult.unknownClassNumber}`,
            review: {
                year:formResult.year,
                grade:formResult.grade,
                reasonForTaking: formResult.reasonForTaking,
                text:formResult.reviewText
            }
        }
        try {
            const newTeacherData = await reviewService.uploadReview(newReview)
            setTeacher(newTeacherData)
            toast.success('Thank you for your review')
            closeForm()
        } catch(e) {
            setNetworkErrorText(e as string)
        }

    };

    const numericalRatings:{label:string, inputName:keyof Inputs}[] = [
        { label: 'Overall Rating', inputName:'overallRating'},
        { label: 'Recognizes Student Difficulties', inputName:'recognizesStudentDifficulties'},
        { label: 'Presents Material Clearly', inputName:'presentsMaterialClearly'},
    ]

    const classInformation:{label:string, inputName:keyof Inputs, options:string[]}[] = [
        { label: 'Year', inputName:'year', options:['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad']},
        { label: 'Grade Achieved', inputName:'grade', options:['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'CR', 'NC']},
        { label: 'Reason For Taking', inputName:'reasonForTaking', options:['Required (Major)', 'Required (Support)', 'Elective']},
    ]

    // Fix scroll position
    useEffect(() => {
        document.body.style.overflowY = "hidden"
        return () => {
            document.body.style.overflowY = "auto"
        }
    },[])
    
    return(
        <form className="p-5 bg-gray-300 opacity-100 rounded shadow cursor-default relative" style={{width:'475px'}} onSubmit={handleSubmit(onSubmit)}>
            <div className="absolute right-0 top-0 p-3 font-bold cursor-pointer" onClick={closeForm}>X</div>
            <h2 className="text-2xl font-bold">Evaluate {teacher.name}</h2>

            <h4 className="mt-4">Class</h4>
            <div className="flex justify-between">
                <select className="h-7 rounded w-40" {...register('knownClass')}>
                    {teacher.classes?.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
                    <option value="">Other</option>
                </select>
                <div>
                    <select className="h-7 rounded" disabled={!!knownClassValue} {...register('unknownClassDepartment')}>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input 
                        className="h-7 w-16 ml-2 rounded appearance-none" 
                        type="number" 
                        placeholder="class #"  
                        disabled={!!knownClassValue} 
                        {...register('unknownClassNumber', {required:{value:knownClassValue == '0', message:'Class Number is required'}})}
                    />
                </div>
            </div>
            <ErrorMessage errors={errors} name="unknownClassNumber" as="div" className="text-red-500 text-sm"/>
            <div className="mt-4">
                {numericalRatings.map(rating =>
                    <div key={rating.label}>
                        <div className="mt-1 flex justify-between">
                            <h4>{rating.label}</h4>
                            <div className="flex">
                            {[0,1,2,3,4].map(n =>
                            <label key={n} className="mr-3">
                                <input 
                                    type="radio"
                                    className="mr-1 form-radio"
                                    value={n}
                                    {...register(rating.inputName, {required:{value:true, message:`${rating.label} is required`}})}>
                                </input>
                                {n}
                            </label>
                            )}
                            </div>
                        </div>
                        <ErrorMessage errors={errors} name={rating.inputName} as="div" className="text-red-500 text-sm"/>
                    </div>
                )}
            </div>
            <div className="mt-4">
                {classInformation.map(dropdown =>
                    <div key={dropdown.label}>                        
                        <div className="mt-1 flex justify-between">
                            <h4>{dropdown.label}</h4>
                            <select {...register(dropdown.inputName)} className="w-40">
                                {dropdown.options.map(option => <option value={option} key={option}>{option}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>
            <h4 className="mt-4">Review:</h4>
            <textarea {...register('reviewText', {required:{value:true, message:'Writing a review is required'}})} className="w-full h-52 rounded"></textarea>
            <ErrorMessage errors={errors} name="reviewText" as="div" className="text-red-500 text-sm"/>
            <div className="flex justify-center mt-2">
                <button className="bg-cal-poly-green text-white rounded-lg p-2 shadow w-24">
                    Submit
                </button>
            </div>
            <div className="text-red-500 text-sm">{networkErrorText}</div>
        </form>
    )
}