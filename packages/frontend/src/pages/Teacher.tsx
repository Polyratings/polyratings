/* eslint-disable react/no-unstable-nested-components */
import { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { ReviewEntry, TeacherEntry } from '@polyratings/shared';
import AnimateHeight from 'react-animate-height';
import AnchorLink from 'react-anchor-link-smooth-scroll';
import StarRatings from 'react-star-ratings';
import { TeacherService, Logger } from '@/services';
import { Backdrop, ClassSection, EvaluateTeacherForm } from '@/components';
import { useService } from '@/hooks';

interface ClassReviews {
  taughtClass:string,
  reviews:ReviewEntry[]
}

export function Teacher() {
  const { id } = useParams<{ id: string }>();

  const [teacherData, setTeacherData] = useState<TeacherEntry | null>(null);

  // Put classes for teachers primary department first. This is to cut down on review spamming
  // of other departments. It is possible for a teacher to teach outside of the department but
  // it is ok if those reviews come after the primary department
  const [teacherReviews, SetTeacherReviews] = useState<ClassReviews[] | null>(null);
  useEffect(() => {
    if(!teacherData) {
      return 
    }
    // Sort Into Departments
    const teacherByDepartments = 
      Object.entries(teacherData?.reviews || {})
      .reduce((acc, [taughtClass, reviews]) => {
        const obj:ClassReviews = {taughtClass, reviews}
        const [department] = taughtClass.split(' ')
        if(acc[department]) {
          acc[department].push(obj)
        } else {
          acc[department] = [obj]
        }
        return acc
      }, {} as {[department:string]: ClassReviews[]})

    // Sort departments by class number
    Object.values(teacherByDepartments)
    .forEach(deparment => deparment.sort((a,b) => {
      const [,aNumber] = a.taughtClass.split(' ')
      const [,bNumber] = b.taughtClass.split(' ')
      return parseInt(aNumber, 10) - parseInt(bNumber, 10)
    }))

    const primaryClasses = teacherByDepartments[teacherData.department]
    const otherClasses = Object.entries(teacherByDepartments)
      .filter(([department]) => department !== teacherData.department)
      .flatMap(([,classReviews]) => classReviews)

    SetTeacherReviews([...primaryClasses, ...otherClasses])
  }, [teacherData])

  const history = useHistory();
  const teacherService = useService(TeacherService);
  const [teacherEvaluationShownDesktop, setTeacherEvaluationShownDesktop] = useState(false);
  const [teacherEvaluationShownMobile, setTeacherEvaluationShownMobile] = useState(false);

  useEffect(() => {
    async function retrieveTeacherData() {
      try {
        const result = await teacherService.getTeacher(id);
        setTeacherData(result);
      } catch (e) {
        const logger = useService(Logger);
        logger.error(`Failed to load teacher with id: ${id}`, e);
        history.push('/');
      }
    }
    retrieveTeacherData();
  }, []);

  function ClassScroll({
    outerClassName,
    innerClassName,
  }: {
    outerClassName: string;
    innerClassName: string;
  }) {
    return (
      <div className={outerClassName}>
        {teacherReviews && teacherReviews.map(({taughtClass}) => (
          <AnchorLink key={taughtClass} href={`#${taughtClass}`} className={innerClassName}>
            {taughtClass}
          </AnchorLink>
        ))}
      </div>
    );
  }

  return (
    <div>
      {teacherEvaluationShownDesktop && (
        <Backdrop>
          <div className="bg-gray-300 opacity-100 rounded shadow p-5" style={{ width: 475 }}>
            <EvaluateTeacherForm
              teacher={teacherData}
              setTeacher={setTeacherData}
              closeForm={() => setTeacherEvaluationShownDesktop(false)}
            />
          </div>
        </Backdrop>
      )}

      <div className="container lg:max-w-5xl mx-auto hidden sm:flex justify-between py-2">
        <div>
          <h2 className="text-4xl text-cal-poly-green">
            {teacherData?.lastName}, {teacherData?.firstName}
          </h2>
          <div>
            {teacherData?.overallRating && (
              <StarRatings
                rating={teacherData?.overallRating}
                starRatedColor="#BD8B13"
                numberOfStars={4}
                starDimension="25px"
                starSpacing="5px "
              />
            )}
          </div>
          <button
            onClick={() => setTeacherEvaluationShownDesktop(true)}
            className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2"
            type="button"
          >
            Evaluate Teacher
          </button>
        </div>        <div className="text-right">
          <h2 className="text-4xl text-cal-poly-green">{teacherData?.overallRating} / 4.00</h2>
          <p>{teacherData?.numEvals} evaluations</p>
          <p> Recognizes Student Difficulties: {teacherData?.studentDifficulties}</p>
          <p>Presents Material Clearly: {teacherData?.materialClear} </p>
        </div>
      </div>

      <div className="sm:hidden container py-2 text-center">
        <h2 className="text-4xl text-cal-poly-green">
          {teacherData?.lastName}, {teacherData?.firstName}
        </h2>
        <p>{teacherData?.department}</p>
        <p>
          Overall Rating:
          {teacherData?.overallRating} / 4.00
        </p>
        <p>
          Recognizes Student Difficulties:
          {teacherData?.studentDifficulties}
        </p>
        <p>
          Presents Material Clearly:
          {teacherData?.materialClear}
        </p>
        <button
          onClick={() => setTeacherEvaluationShownMobile(!teacherEvaluationShownMobile)}
          className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2"
          type="button"
        >
          {teacherEvaluationShownMobile ? 'Close Evaluation' : 'Evaluate Teacher'}
        </button>
      </div>

      <div className="container lg:max-w-5xl bg-cal-poly-green h-1 mx-auto mt-2" />
      <AnimateHeight duration={500} height={teacherEvaluationShownMobile ? 'auto' : 0}>
        <div className="bg-cal-poly-green text-white p-5">
          <EvaluateTeacherForm
            teacher={teacherData}
            setTeacher={setTeacherData}
            closeForm={() => setTeacherEvaluationShownMobile(false)}
          />
        </div>
      </AnimateHeight>

      {teacherReviews && teacherReviews.map(({taughtClass, reviews}) => (
        <ClassSection key={taughtClass} reviews={reviews} taughtClass={taughtClass} />
      ))}
      <ClassScroll
        outerClassName="hidden xl:flex flex-col fixed ml-4 top-1/2 transform -translate-y-1/2 max-h-10/12 overflow-y-auto"
        innerClassName="text-cal-poly-green text-lg font-semibold mt-2"
      />
      {/* Mobile class scroll needs room to see all reviews */}
      <div className="block md:hidden h-16 w-full" />
      <ClassScroll
        outerClassName="flex items-center md:hidden h-14 fixed bg-cal-poly-green w-full bottom-0 overflow-x-auto scrollbar-hidden"
        innerClassName="text-md font-semibold h-8 bg-cal-poly-gold text-white ml-4 rounded-xl py-1 px-2 whitespace-nowrap"
      />
    </div>
  );
}
