/* eslint-disable react/no-unstable-nested-components */
import { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { TeacherEntry, ReviewEntry } from '@polyratings/shared';
import AnimateHeight from 'react-animate-height';
import AnchorLink from 'react-anchor-link-smooth-scroll';
import StarRatings from 'react-star-ratings';
import { TeacherService, Logger } from '@/services';
import { Backdrop, EvaluateTeacherForm } from '@/components';
import { useService } from '@/hooks';

export function Teacher() {
  const { id } = useParams<{ id: string }>();

  const [teacherData, setTeacherData] = useState<TeacherEntry | null>(null);

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
        {Object.keys(teacherData?.reviews || {}).map((taughtClass) => (
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
        </div>
        <div className="text-right">
          <h2 className="text-4xl text-cal-poly-green">{teacherData?.overallRating} / 4.00</h2>
          <p>{teacherData?.numEvals} evaluations</p>
          <p>
            Recognizes Student Difficulties:
            {teacherData?.studentDifficulties}
          </p>
          <p>
            Presents Material Clearly:
            {teacherData?.materialClear}
          </p>
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

      {Object.entries(teacherData?.reviews || {}).map(([taughtClass, reviews]) => (
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

function ClassSection({ reviews, taughtClass }: { reviews: ReviewEntry[]; taughtClass: string }) {
  const [expanded, setExpanded] = useState(false);
  const UNEXPANDED_LIMIT = 2;
  const unexpandedReviews = reviews.slice(0, UNEXPANDED_LIMIT);
  const expandedReviews = reviews.slice(UNEXPANDED_LIMIT);

  const unexpandedPreviewHeight = (reviews: ReviewEntry[]) =>
    reviews.length > UNEXPANDED_LIMIT ? 25 : 0;

  return (
    <div className="pt-4 relative" id={taughtClass}>
      <h2 className="text-center text-4xl text-cal-poly-green">{taughtClass}</h2>
      <div className="container lg:max-w-5xl flex flex-col m-auto">
        {unexpandedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      <AnimateHeight
        duration={500}
        height={expanded ? 'auto' : unexpandedPreviewHeight(reviews)}
        className={`transition-all ${expanded ? '' : 'opacity-25'}`}
      >
        <div className="container lg:max-w-5xl flex flex-col m-auto">
          {expandedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </AnimateHeight>
      {reviews.length > UNEXPANDED_LIMIT && !expanded && (
        <div
          className="text-center transform -translate-y-1 z-10 text-cal-poly-green underline font-medium cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          Show More
        </div>
      )}
      {expanded && (
        <div className="flex justify-center">
          <AnchorLink
            className="text-cal-poly-green underline font-medium cursor-pointer"
            // Use set timeout in order for the anchor to scroll before closing the expanded reviews
            onClick={() => setTimeout(() => setExpanded(!expanded), 300)}
            href={`#${taughtClass}`}
          >
            Show Less
          </AnchorLink>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewEntry }) {
  return (
    <div
      className="bg-white w-full rounded-3xl py-2 px-4 my-2 border-cal-poly-gold border-4 flex"
      key={review.id}
    >
      <div className="hidden lg:flex flex-col w-32 flex-shrink-0 m-auto mr-4 text-center text-sm">
        <div>{review.gradeLevel}</div>
        <div>{review.grade}</div>
        <div>{review.courseType}</div>
        <div>
          {new Date(review.postDate).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
          })}
        </div>
      </div>
      <div className="hidden lg:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0" />
      <div className="flex-grow">{review.rating}</div>
    </div>
  );
}
