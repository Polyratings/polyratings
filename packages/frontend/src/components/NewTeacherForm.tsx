import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
// import { EvaluateTeacherForm } from "./EvaluateTeacherForm";
import ClipLoader from 'react-spinners/ClipLoader';
import { Teacher, AddReview } from '@polyratings/shared';
import { toast } from 'react-toastify';
import { useHistory } from 'react-router';
import { TeacherService } from '@/services';
import { departments } from '@/constants';
import { useService } from '@/hooks';
import { EvaluateTeacherForm } from '.';

interface NewTeacherFormInputs {
  teacherFirstName: string;
  teacherLastName: string;
  teacherDepartment: string;
}

export const NEW_TEACHER_FORM_WIDTH = 475;

export function NewTeacherForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewTeacherFormInputs>();
  const teacherService = useService(TeacherService);
  const [networkErrorText, setNetworkErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const reviewFormRef = useRef<HTMLFormElement>(null);
  const teacherFormRef = useRef<HTMLFormElement>(null);
  const history = useHistory();

  // This is needed to synchronize the two forms
  const kickOffSubmit = () => {
    if (!teacherFormRef.current) {
      return;
    }
    // @ts-expect-error Ignore ts error for onSubmit handler
    teacherFormRef.current.onsubmit = handleSubmit(() => {});
    // Double submit form to get error messages
    teacherFormRef.current?.requestSubmit();
    reviewFormRef.current?.requestSubmit();
  };

  // Use closure in order to access the data from the two forms
  const reviewFormSubmitOverride = (reviewOverrideData: AddReview) => {
    if (!teacherFormRef.current) {
      return;
    }
    // @ts-expect-error Ignore ts error for onSubmit handler
    teacherFormRef.current.onsubmit = handleSubmit(async (teacherData) => {
      setLoading(true);
      const newTeacher: Teacher = {
        id: '',
        firstName: teacherData.teacherFirstName,
        lastName: teacherData.teacherLastName,
        department: teacherData.teacherDepartment,
        numEvals: 1,
        overallRating: reviewOverrideData.overallRating,
        studentDifficulties: reviewOverrideData.recognizesStudentDifficulties,
        materialClear: reviewOverrideData.presentsMaterialClearly,
        courses: [reviewOverrideData.classIdOrName],
        reviews: {
          [reviewOverrideData.classIdOrName]: [reviewOverrideData.review],
        },
      };

      try {
        const newTeacherId = await teacherService.addNewTeacher(newTeacher);
        toast.success('Thank you for adding a teacher');
        history.push(`/teacher/${newTeacherId}`);
      } catch (e) {
        setNetworkErrorText(e as string);
      }
      setLoading(false);
    });
    teacherFormRef.current?.requestSubmit();
  };

  return (
    <div className="p-5 bg-gray-300 opacity-100 rounded relative" style={{ width: '40rem' }}>
      <form onSubmit={handleSubmit(() => {})} ref={teacherFormRef}>
        <h2 className="text-2xl font-bold">Teacher</h2>
        <div className="flex mt-2">
          <h4>Department</h4>
          <select className="h-7 rounded ml-2" {...register('teacherDepartment')}>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex mt-2">
          <h4>First Name</h4>
          <input
            type="text"
            className="rounded h-7 w-44 ml-4 pl-2"
            placeholder="First Name"
            {...register('teacherFirstName', {
              required: { value: true, message: 'Teacher First Name Required' },
            })}
          />
        </div>
        <div className="flex mt-1">
          <h4>Last Name</h4>
          <input
            type="text"
            className="rounded h-7 w-44 ml-4 pl-2"
            placeholder="Last Name"
            {...register('teacherLastName', {
              required: { value: true, message: 'Teacher Last Name Required' },
            })}
          />
        </div>
        <ErrorMessage
          errors={errors}
          name="teacherName"
          as="div"
          className="text-red-500 text-sm"
        />
        <ErrorMessage
          errors={errors}
          name="teacherName"
          as="div"
          className="text-red-500 text-sm"
        />
      </form>
      <h2 className="text-2xl font-bold my-2">Review</h2>
      <EvaluateTeacherForm
        teacher={null}
        setTeacher={() => {}}
        closeForm={() => {}}
        innerRef={reviewFormRef}
        overrideSubmitHandler={reviewFormSubmitOverride}
      />

      <div className="flex justify-center mt-2">
        <button
          className="bg-cal-poly-green text-white rounded-lg p-2 shadow w-24"
          type="button"
          onClick={kickOffSubmit}
          style={{ display: loading ? 'none' : 'block' }}
        >
          Submit
        </button>
        {/* Exact size for no layer shift when replacing button */}
        <ClipLoader color="#1F4715" loading={loading} size={34} />
      </div>
      <div className="text-red-500 text-sm">{networkErrorText}</div>
    </div>
  );
}
