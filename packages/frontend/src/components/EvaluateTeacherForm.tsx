import { RefObject, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { toast } from 'react-toastify';
import { TeacherEntry, AddReview } from '@polyratings/shared';
import ClipLoader from 'react-spinners/ClipLoader';
import { ReviewService } from '@/services';
import { departments } from '@/constants';
import { useService } from '@/hooks';

interface EvaluateTeacherFormInputs {
  knownClass: string;
  overallRating: number;
  recognizesStudentDifficulties: number;
  presentsMaterialClearly: number;
  reviewText: string;
  unknownClassDepartment: string;
  unknownClassNumber: number;
  year: string;
  grade: string;
  reasonForTaking: string;
}

interface EvaluateTeacherFormProps {
  teacher: TeacherEntry | null;
  setTeacher: (teacher: TeacherEntry) => void;
  closeForm: () => void;
  overrideSubmitHandler?: (review: AddReview) => void | Promise<void>;
  innerRef?: RefObject<HTMLFormElement>;
}
export function EvaluateTeacherForm({
  teacher,
  setTeacher,
  closeForm,
  overrideSubmitHandler,
  innerRef,
}: EvaluateTeacherFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EvaluateTeacherFormInputs>({
    defaultValues: {
      knownClass: Object.keys(teacher?.reviews || {})[0],
    },
  });
  const knownClassValue = watch('knownClass');
  const reviewService = useService(ReviewService);
  const [networkErrorText, setNetworkErrorText] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit: SubmitHandler<EvaluateTeacherFormInputs> = async (formResult) => {
    setLoading(true);
    const newReview: AddReview = {
      overallRating: formResult.overallRating,
      recognizesStudentDifficulties: formResult.recognizesStudentDifficulties,
      presentsMaterialClearly: formResult.presentsMaterialClearly,
      // Purposely set null as any due to use case where when teacher == null teacherId is not used
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teacherId: teacher?.id || (null as any),
      classIdOrName:
        formResult.knownClass ||
        `${formResult.unknownClassDepartment} ${formResult.unknownClassNumber}`,
      review: {
        gradeLevel: formResult.year,
        grade: formResult.grade,
        courseType: formResult.reasonForTaking,
        rating: formResult.reviewText,
        profferer: teacher?.id ?? '',
        postDate: new Date().toString(),
        department: formResult.knownClass.split(' ')[0] ?? formResult.unknownClassDepartment,
        courseNum: formResult.knownClass.split(' ')[1] ?? formResult.unknownClassNumber,
      },
    };
    if (overrideSubmitHandler) {
      overrideSubmitHandler(newReview);
    } else {
      try {
        const newTeacherData = await reviewService.uploadReview(newReview);
        setTeacher(newTeacherData);
        toast.success('Thank you for your review');
        closeForm();
      } catch (e) {
        setNetworkErrorText(e as string);
      }
    }
    setLoading(false);
  };

  const numericalRatings: { label: string; inputName: keyof EvaluateTeacherFormInputs }[] = [
    { label: 'Overall Rating', inputName: 'overallRating' },
    { label: 'Recognizes Student Difficulties', inputName: 'recognizesStudentDifficulties' },
    { label: 'Presents Material Clearly', inputName: 'presentsMaterialClearly' },
  ];

  const classInformation: {
    label: string;
    inputName: keyof EvaluateTeacherFormInputs;
    options: string[];
  }[] = [
    {
      label: 'Year',
      inputName: 'year',
      options: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad'],
    },
    {
      label: 'Grade Achieved',
      inputName: 'grade',
      options: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'CR', 'NC'],
    },
    {
      label: 'Reason For Taking',
      inputName: 'reasonForTaking',
      options: ['Required (Major)', 'Required (Support)', 'Elective'],
    },
  ];

  return (
    <form className="relative w-full" onSubmit={handleSubmit(onSubmit)} ref={innerRef}>
      {teacher && (
        <div
          className="absolute right-0 top-0 p-3 font-bold cursor-pointer hidden sm:block"
          onClick={closeForm}
        >
          X
        </div>
      )}
      {teacher && (
        <h2 className="text-2xl font-bold hidden sm:block mb-4">
          Evaluate {teacher.lastName},{teacher.firstName}
        </h2>
      )}

      <h4>Class</h4>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        {teacher && (
          <select className="h-7 rounded w-40 text-black" {...register('knownClass')}>
            {Object.keys(teacher.reviews || {})?.map((c) => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
            <option value="">Other</option>
          </select>
        )}

        <div
          className="text-black pt-1 sm:pt-0"
          style={{ display: knownClassValue ? 'none' : 'block' }}
        >
          <select className="h-7 rounded" {...register('unknownClassDepartment')}>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            className="h-7 w-16 ml-2 rounded appearance-none"
            type="number"
            placeholder="class #"
            {...register('unknownClassNumber', {
              required: { value: !knownClassValue, message: 'Class Number is required' },
            })}
          />
        </div>
      </div>
      <ErrorMessage
        errors={errors}
        name="unknownClassNumber"
        as="div"
        className="text-red-500 text-sm"
      />
      <div className="mt-2">
        {numericalRatings.map((rating) => (
          <div key={rating.label}>
            <div className="mt-1 flex justify-between">
              <h4>{rating.label}</h4>
              <div className="flex">
                <select {...register(rating.inputName)} className="text-black rounded md:hidden">
                  {[4, 3, 2, 1, 0].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {[0, 1, 2, 3, 4].map((n) => (
                  <label key={n} className="mr-3 hidden md:block">
                    <input
                      type="radio"
                      className="mr-1 form-radio"
                      value={n}
                      {...register(rating.inputName)}
                    />
                    {n}
                  </label>
                ))}
              </div>
            </div>
            <ErrorMessage
              errors={errors}
              name={rating.inputName}
              as="div"
              className="text-red-500 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="mt-2">
        {classInformation.map((dropdown) => (
          <div key={dropdown.label}>
            <div className="mt-1 flex justify-between">
              <h4>{dropdown.label}</h4>
              <select {...register(dropdown.inputName)} className="w-40 text-black rounded">
                {dropdown.options.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      <h4 className="mt-4">Review:</h4>
      <textarea
        {...register('reviewText', {
          required: { value: true, message: 'Writing a review is required' },
        })}
        className="w-full h-52 rounded text-black p-2"
      />
      <ErrorMessage errors={errors} name="reviewText" as="div" className="text-red-500 text-sm" />
      <div className="flex justify-center mt-2">
        {teacher && (
          <div>
            <button
              className="bg-cal-poly-gold sm:bg-cal-poly-green text-white rounded-lg p-2 shadow w-24"
              style={{ display: loading ? 'none' : 'block' }}
              type="button"
            >
              Submit
            </button>
            {/* Exact size for no layer shift */}
            <ClipLoader color="#1F4715" loading={loading} size={34} />
          </div>
        )}
      </div>
      <div className="text-red-500 text-sm">{networkErrorText}</div>
    </form>
  );
}
