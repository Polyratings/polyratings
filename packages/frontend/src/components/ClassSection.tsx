import { Review } from '@polyratings/shared';
import { useState } from 'react';
import AnchorLink from 'react-anchor-link-smooth-scroll';
import AnimateHeight from 'react-animate-height';

export const UNEXPANDED_LIMIT = 2;

export interface ClassSectionProps {
    reviews: Review[];
    taughtClass: string;
    disableDropDown:boolean
}

export function ClassSection({
    reviews,
    taughtClass,
    disableDropDown
}:ClassSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const unexpandedReviewCount = disableDropDown ? reviews.length : UNEXPANDED_LIMIT
    const unexpandedReviews = reviews.slice(0, unexpandedReviewCount);
    const expandedReviews = reviews.slice(unexpandedReviewCount);

    const unexpandedPreviewHeight = (reviews: Review[]) =>
        reviews.length > unexpandedReviewCount ? 25 : 0;

    return (
        <div className="pt-4 relative" id={taughtClass}>
            <h2 className="text-center text-4xl text-cal-poly-green">{taughtClass}</h2>
            <div className="container md:max-w-5xl flex flex-col m-auto px-2">
                {unexpandedReviews.map((review, i) => (
                    <ReviewCard key={i} review={review} />
                ))}
            </div>

            <AnimateHeight
                duration={500}
                height={expanded ? 'auto' : unexpandedPreviewHeight(reviews)}
                className={`transition-all ${expanded ? '' : 'opacity-25'}`}
            >
                <div className="container md:max-w-5xl flex flex-col m-auto px-2">
                    {expandedReviews.map((review, i) => (
                        <ReviewCard key={i} review={review} />
                    ))}
                </div>
            </AnimateHeight>
            {Boolean(expandedReviews.length) && !expanded && (
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

function ReviewCard({ review }: { review: Review }) {
    return (
        <div
            className="bg-white w-full rounded-3xl py-2 px-4 my-2 border-cal-poly-gold border-4 flex flex-col md:flex-row"
        >
            <div className="hidden md:flex flex-col w-32 flex-shrink-0 m-auto mr-4 text-center text-sm">
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

            <div className="flex md:hidden flex-col flex-shrink-0 m-auto text-center text-sm">
                <div>Year: {review.gradeLevel}</div>
                <div>Grade Received: {review.grade}</div>
            </div>

            {/* Desktop divider */}
            <div className="hidden md:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0" />
            {/* Mobile divider */}
            <div className="flex md:hidden bg-cal-poly-green w-4/5 h-1 m-auto my-2" />

            <div className="flex-grow">{review.rating}</div>
        </div>
    );
}
