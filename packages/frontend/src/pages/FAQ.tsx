import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { PageMeta, StaticPageHeader } from "@/components";
import { cn } from "@/utils";

interface FAQItemProps {
    children: ReactNode;
    initiallyOpen?: boolean;
    question: ReactNode;
}

function FAQItem({ children, initiallyOpen = false, question }: FAQItemProps) {
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    const contentId = useId();

    return (
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <h2>
                <button
                    type="button"
                    aria-controls={contentId}
                    aria-expanded={isOpen}
                    className={cn(
                        "group flex w-full items-center justify-between gap-5 px-6 py-5 text-left",
                        "text-xl font-bold tracking-tight text-brand transition-colors",
                        "hover:bg-muted/70 focus-visible:z-10 focus-visible:outline-3",
                        "focus-visible:outline-offset-[-3px] focus-visible:outline-ring",
                    )}
                    onClick={() => setIsOpen((open) => !open)}
                >
                    <span>{question}</span>
                    <ChevronDown
                        aria-hidden="true"
                        className="size-5 shrink-0 text-accent transition-transform duration-200 group-aria-expanded:rotate-180"
                    />
                </button>
            </h2>
            <div id={contentId} hidden={!isOpen} className="border-t border-border px-6 py-5">
                <div className="space-y-4 text-[1.05rem] leading-8 text-foreground">{children}</div>
            </div>
        </section>
    );
}

export function FAQ() {
    const linkStyle = cn(
        "font-semibold text-brand underline decoration-accent decoration-2 underline-offset-4",
        "transition-colors hover:text-brand/75 focus-visible:rounded-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
    );

    return (
        <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-5xl px-4 py-8 outline-none md:py-16"
        >
            <PageMeta
                title="Frequently Asked Questions"
                description="Answers about Polyratings reviews, moderation, and how student ratings of Cal Poly professors work."
                path="/faq"
            />
            <StaticPageHeader>Frequently Asked Questions</StaticPageHeader>

            <div className="space-y-4">
                <FAQItem
                    initiallyOpen
                    question="How do I know the ratings on a professor's page come from students?"
                >
                    <p>Short answer: you don&apos;t.</p>
                    <p>
                        In fact, it&apos;s potentially worse than that... you don&apos;t even know
                        that someone rating a professor, assuming they are a student, which is a
                        huge assumption to make, ever took a professor&apos;s class.
                    </p>
                    <p>
                        Polyratings does everything in its power to review questionable postings
                        brought to our attention, but a function of Polyratings&apos; privacy
                        guarantee is lack of authentication and login. This means that a professor
                        could post positive ratings about themselves to their pages, or negative
                        ratings about other professors (both of which have happened in the past).
                    </p>
                    <p>
                        We have been looking into ways of curbing this practice, but for now,
                        Polyratings users will have to rely on their own judgement in determining
                        which ratings to consider to be accurate; if you think about it, that
                        requirement is no different than information you get from any other source.
                    </p>
                    <p>
                        If you believe a rating comes from a questionable source, please report it
                        using the flag next to the rating. Leaving a detailed reason for the report
                        as well as a contact email for a more complex case go a long way to resolve
                        reports.
                    </p>
                </FAQItem>

                <FAQItem question="What are your guidelines regarding comments?">
                    <p>The standard by which we judge all comments is a simple one: value.</p>
                    <p>
                        We do not judge comments based upon the words they contain or the way they
                        express their opinion, but if a comment is reported as inappropriate, we
                        look to see what value it adds to both Polyratings and to Cal Poly students
                        in general.
                    </p>
                    <p>Calling a professor names is not only immature, but does not add value.</p>
                    <p>
                        Posting anything but a comment (emails, test questions, etc.) about the
                        professor does not add value.
                    </p>
                    <p>
                        Replying to other comments instead of giving your own opinion on the
                        professor does not add value.
                    </p>
                    <p>
                        Value to the Cal Poly community is the gold standard by which we rate
                        comments when problems are brought to our attention... if the comment lacks
                        value, it will be deleted.
                    </p>
                </FAQItem>

                <FAQItem question="Why do you let inappropriate comments be posted in the first place?">
                    <p>
                        Polyratings&apos; staff does not have time to read and approve every
                        comment.
                    </p>
                    <p>
                        As such, we only hear about inappropriate comments after the fact; just
                        because a comment appears does not mean that it&apos;s been reviewed and
                        deemed acceptable.
                    </p>
                    <p>
                        As an aside, every rating is sent through a machine learning model that
                        tries to check for toxicity and inappropriate language. This catches some of
                        the worst offending ratings but can not catch all of them.
                    </p>
                </FAQItem>

                <FAQItem
                    question={
                        <>
                            I made a comment about a professor, but I&apos;ve thought about it, and
                            I wish I hadn&apos;t posted my comment; will you remove/edit it for me?
                        </>
                    }
                >
                    <p>No.</p>
                    <p>
                        If we made time to personally edit every student&apos;s comments, we&apos;d
                        never have time for our own school work. Think <b>before</b> you post.
                    </p>
                    <p>
                        Besides, there&apos;s the side issue of verifying that the person who&apos;s
                        requesting we remove or edit the post is the one who really wrote it, which
                        opens up a whole different can of worms.
                    </p>
                    <p>As such, any requests to edit or delete comments will be ignored.</p>
                </FAQItem>

                <FAQItem question="I have this really cool feature I'd like you to implement; will you write it for me and put it in Polyratings?">
                    <p>
                        Write us an issue on{" "}
                        <a
                            href="https://github.com/Polyratings/polyratings/issues"
                            target="_blank"
                            rel="noreferrer"
                            className={linkStyle}
                        >
                            Github
                        </a>
                        . We love to hear feedback and appreciate any help we can get. You can also
                        join our{" "}
                        <a
                            href="https://discord.com/invite/jD4mfMugYN"
                            target="_blank"
                            rel="noreferrer"
                            className={linkStyle}
                        >
                            Discord
                        </a>{" "}
                        server. If you are CS minded you can even make your idea a reality.
                    </p>
                    <p>
                        Polyratings 4.0 is fully open source meaning that anyone can contribute. If
                        you would like something changed or would like to implement a new feature,
                        open a pull request!
                    </p>
                </FAQItem>

                <FAQItem question="How do I rate a class after Cal Poly switched to semesters?">
                    <p>
                        Starting Fall 2026, Cal Poly course numbers are 4 digits (for example PHIL
                        2231). Older quarter courses stay 3 digits (PHIL 231) and are listed
                        separately. If the semester course is not in the dropdown yet, choose Other
                        and enter the 4-digit number.
                    </p>
                </FAQItem>

                <FAQItem
                    question={
                        <>
                            I&apos;m a student/professor, and I&apos;ve seen a comment <i>you</i>{" "}
                            wrote on your website and I&apos;m going to sue the crap out of you if
                            you don&apos;t take it down!
                        </>
                    }
                >
                    <p>
                        Despite the fact that this is not a question, we often get emails like this
                        from professors and occasionally from students, and we would like to clarify
                        our position.
                    </p>
                    <p>
                        If you think a rating is defamatory, it might be. Report it with the flag
                        next to the rating. We review reports, and we usually side with the person
                        who reported the content.
                    </p>
                    <p>
                        We did not write student ratings. Those comments are written by visitors. A
                        federal law (
                        <a
                            href="https://www.congress.gov/crs-product/R46751"
                            target="_blank"
                            rel="noreferrer"
                            className={linkStyle}
                        >
                            Section 230 of the Communications Decency Act
                        </a>
                        ) often protects websites from being treated as the author of content other
                        people post.
                    </p>
                    <p>
                        A specific report goes a lot further than a threat. If you see something
                        that should not be on the site, please report it.
                    </p>
                </FAQItem>
            </div>
        </main>
    );
}
