import { TeacherEntry } from "@polyratings-revamp/shared";
import star from '../assets/star.svg'
import { useHistory } from "react-router-dom"
import { useService } from "../hooks";
import { TeacherService } from "../services";

interface TeacherCardProps {
    teacher:TeacherEntry
}

export const TEACHER_CARD_HEIGHT = 160

export function TeacherCard({teacher}:TeacherCardProps) {
    const history = useHistory()
    const [teacherService] = useService(TeacherService)

    const onClick = async () => {
        // Load teacher into the local teacher card for next page to load immediately
        await teacherService.getTeacher(teacher.id)
        history.push(`/teacher/${teacher.id}`)
    }

    return(
        <div onClick={onClick}>
            <div className="w-full h-32 border-cal-poly-gold border-4 bg-white flex justify-between items-center text-cal-poly-green cursor-pointer" style={{borderRadius:'1.5rem'}}>
            <h3 className="text-3xl font-medium pl-3">{teacher.lastName}, {teacher.firstName}</h3>
                <div className="text-right text-xl pr-3 font-medium flex-shrink-0">
                    <div>{teacher.department}</div>
                    <div>{teacher.overallRating}</div>
                    <div className="flex items-center"><img className="pr-1 h-4" src={star} alt="" />{teacher.numEvals} evals</div>
                </div>
            </div>
        </div>

    )
}