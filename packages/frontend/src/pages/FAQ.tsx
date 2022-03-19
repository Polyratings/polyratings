export function FAQ() {
    const cardStyle =
        "bg-white px-4 py-2 shadow-md border-cal-poly-gold border-b-2 border-l-2 border-r-2";
    const paragraphStyle = "py-[.125rem]";
    const subTitleStyle = "text-cal-poly-green font-medium text-2xl mb-2";
    return (
        <div className="container m-auto px-2 md:px-12 max-w-7xl">
            <h1 className="text-4xl text-cal-poly-green mb-7 mt-12 font-semibold pl-1 md:pl-0">
                Frequently Asked Questions
            </h1>
            <div className="w-full h-[.125rem] bg-cal-poly-green mb-7" />

            <div className={`${cardStyle} border-t-2 rounded-t-md`}>
                <h2 className={subTitleStyle}>
                    How do I know the ratings on a professor&apos;s page come from students?
                </h2>
                <p className={paragraphStyle}>Short answer: you don&apos;t.</p>
                <p className={paragraphStyle}>
                    In fact, it&apos;s potentially worse than that... you don&apos;t even know that
                    someone rating a professor, assuming they are a student, which is a huge
                    assumption to make, ever took a professor&apos;s class.
                </p>
                <p className={paragraphStyle}>
                    Polyratings.com does everything in its power to review questionable postings
                    brought to our attention, but a function of Polyratings&apos; privacy guarantee
                    is lack of authentication and login. This means that a professor could post
                    positive ratings about themselves to their pages, or negative ratings about
                    other professors (both of which have happened in the past).
                </p>
                <p className={paragraphStyle}>
                    We have been looking into ways of curbing this practice, but for now,
                    Polyratings users will have to rely on their own judgement in determining which
                    ratings to consider to be accurate; if you think about it, that requirement is
                    no different than information you get from any other source.
                </p>
                <p className={paragraphStyle}>
                    If you believe a rating comes from a questionable source, please report it.
                </p>
            </div>

            <div className={cardStyle}>
                <h2 className={subTitleStyle}>What are your guidelines regarding comments?</h2>
                <p className={paragraphStyle}>
                    The standard by which we judge all comments is a simple one: value.
                </p>
                <p className={paragraphStyle}>
                    We do not judge comments based upon the words they contain or the way they
                    express their opinion, but if a comment is reported as innapropriate, we look to
                    see what value it adds to both Polyratings.com and to Cal Poly students in
                    general.
                </p>
                <p className={paragraphStyle}>
                    Calling a professor names is not only immature, but does not add value.
                </p>
                <p className={paragraphStyle}>
                    Posting anything but a comment (emails, test questions, etc.) about the
                    professor does not add value.
                </p>
                <p className={paragraphStyle}>
                    Replying to other comments instead of giving your own opinion on the professor
                    does not add value.
                </p>
                <p className={paragraphStyle}>
                    Value to the Cal Poly community is the gold standard by which we rate comments
                    when problems are brought to our attention... if the comment lacks value, it
                    will be deleted.
                </p>
            </div>
            <div className={cardStyle}>
                <h2 className={subTitleStyle}>
                    Why do you let innapropriate comments be posted in the first place?
                </h2>
                <p className={paragraphStyle}>
                    Polyratings&apos; staff does not have time to read and approve every comment.
                </p>
                <p className={paragraphStyle}>
                    As such, we only hear about innapropriate comments after the fact; just because
                    a comment appears does not mean that it&apos;s been reviewed and deemed
                    acceptable.
                </p>
                <p className={paragraphStyle}>
                    As an aside, every rating is sent through a machine learning model that tries to
                    check for toxicity and inappropriate language. This catches some of the worst
                    offending ratings but can not catch all of them.
                </p>
            </div>
            <div className={cardStyle}>
                <h2 className={subTitleStyle}>
                    I made a comment about a professor, but I&apos;ve thought about it, and I wish I
                    hadn&apos;t posted my comment; will you remove/edit it for me?
                </h2>
                <p className={paragraphStyle}>No.</p>
                <p className={paragraphStyle}>
                    If we made time to personally edit every student&apos;s comments, we&apos;d
                    never have time for our own school work. Think <b>before</b> you post.
                </p>
                <p className={paragraphStyle}>
                    Besides, there&apos;s the side issue of verifying that the person who&apos;s
                    requesting we remove or edit the post is the one who really wrote it, which
                    opens up a whole different can of worms.
                </p>
                <p className={paragraphStyle}>
                    As such, any requests to edit or delete comments will be ignored.
                </p>
            </div>
            <div className={cardStyle}>
                <h2 className={subTitleStyle}>
                    I have this really cool feature I&apos;d like you to implement; will you write
                    it for me and put it in Polyratings?
                </h2>
                <p className={paragraphStyle}>
                    Write us an issue on{" "}
                    <a
                        href="https://github.com/Polyratings/polyratings/issues"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Github
                    </a>
                </p>
            </div>
        </div>
    );
}
