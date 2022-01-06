import { ReviewEntry } from '@polyratings/shared';
import { useState } from 'react';
import AnchorLink from 'react-anchor-link-smooth-scroll';
import AnimateHeight from 'react-animate-height';

export const UNEXPANDED_LIMIT = 2;

export function ClassSection({ reviews, taughtClass }: { reviews: ReviewEntry[]; taughtClass: string }) {
  const [expanded, setExpanded] = useState(false);
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
        {Boolean(expandedReviews.length)  && !expanded && (
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
