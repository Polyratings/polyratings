export function FAQ() {
    const cardStyle =
        "bg-white px-4 py-2 shadow-md border-cal-poly-gold border-b-2 border-l-2 border-r-2";
    const paragraphStyle = "py-[.125rem]";
    const subTitleStyle = "text-cal-poly-green font-medium text-2xl mb-2";
    const linkStyle = "hover:underline text-cal-poly-green font-semibold";
    return (
        <div id="main" className="container m-auto mb-12 max-w-7xl px-2 md:px-12">
            <h1 className="text-cal-poly-green mb-7 mt-12 pl-1 text-4xl font-semibold md:pl-0">
                Frequently Asked Questions
            </h1>
            <div className="bg-cal-poly-green mb-7 h-[.125rem] w-full" />

            <div className={`${cardStyle} rounded-t-md border-t-2`}>
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
                    Polyratings does everything in its power to review questionable postings brought
                    to our attention, but a function of Polyratings&apos; privacy guarantee is lack
                    of authentication and login. This means that a professor could post positive
                    ratings about themselves to their pages, or negative ratings about other
                    professors (both of which have happened in the past).
                </p>
                <p className={paragraphStyle}>
                    We have been looking into ways of curbing this practice, but for now,
                    Polyratings users will have to rely on their own judgement in determining which
                    ratings to consider to be accurate; if you think about it, that requirement is
                    no different than information you get from any other source.
                </p>
                <p className={paragraphStyle}>
                    If you believe a rating comes from a questionable source, please report it using
                    the flag next to the rating. Leaving a detailed reason for the report as well as
                    a contact email for a more complex case go a long way to resolve reports.
                </p>
            </div>

            <div className={cardStyle}>
                <h2 className={subTitleStyle}>What are your guidelines regarding comments?</h2>
                <p className={paragraphStyle}>
                    The standard by which we judge all comments is a simple one: value.
                </p>
                <p className={paragraphStyle}>
                    We do not judge comments based upon the words they contain or the way they
                    express their opinion, but if a comment is reported as inappropriate, we look to
                    see what value it adds to both Polyratings and to Cal Poly students in general.
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
                    Why do you let inappropriate comments be posted in the first place?
                </h2>
                <p className={paragraphStyle}>
                    Polyratings&apos; staff does not have time to read and approve every comment.
                </p>
                <p className={paragraphStyle}>
                    As such, we only hear about inappropriate comments after the fact; just because
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
                        className={linkStyle}
                    >
                        Github
                    </a>
                    . We love to hear feedback and appreciate any help we can get. You can also join
                    our{" "}
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
                <p className={paragraphStyle}>
                    Polyratings 4.0 is fully open source meaning that anyone can contribute. If you
                    would like something changed or would like to implement a new feature, open a
                    pull request!
                </p>
            </div>
            <div className={`${cardStyle} rounded-b-md`}>
                <h2 className={subTitleStyle}>
                    I&apos;m a student/professor, and I&apos;ve seen a comment <i>you</i> wrote on
                    your website and I&apos;m going to sue the crap out of you if you don&apos;t
                    take it down!
                </h2>
                <p className={paragraphStyle}>
                    Despite the fact that this is not a question, we often get comments like this
                    from professors and occasionally from students (if you can believe it) and
                    we&apos;d like to clarify our position on these types of emails.
                </p>
                <p className={paragraphStyle}>
                    In a nutshell, you can&apos;t sue Polyratings. You may think a comment about you
                    is defamatory and libelous, and it may very well be.
                </p>
                <p className={paragraphStyle}>
                    <b>But</b>, we didn&apos;t write the comment. The comment is not ours; it&apos;s
                    the property of the student who wrote it and while you&apos;re welcome to sue
                    the author (assuming you can find out who they are), you really can&apos;t sue
                    Polyratings, because we haven&apos;t broken any laws (and you wouldn&apos;t get
                    any money out of us poor college students anyway).
                </p>
                <p className={paragraphStyle}>
                    The Communications Decency Act of 1996 protects Internet service providers
                    (ISPs) and website operators from being sued for original comments made by
                    visitors to the site. And while the CDA itself has been struck down by the
                    Supreme Court for other reasons, courts, in cases involving{" "}
                    <a
                        href="https://yahoo.com"
                        target="_blank"
                        rel="noreferrer"
                        className={linkStyle}
                    >
                        Yahoo!
                    </a>{" "}
                    and{" "}
                    <a
                        href="https://aol.com"
                        target="_blank"
                        rel="noreferrer"
                        className={linkStyle}
                    >
                        AOL
                    </a>
                    , have generally followed the precedent set by the CDA that ISPs and website
                    operators carry immunity from being sued for content posted by others.
                </p>
                <p className={paragraphStyle}>
                    So please... if you find inappropriate content in reference to you on
                    Polyratings, please notify us. But don&apos;t write a scathing email threatening
                    to sue us. For one, it makes your credibility go way down because you&apos;re
                    threatening something you can&apos;t deliver on and secondly, it also
                    doesn&apos;t really endear us to help you, even though over 98% of the time
                    we&apos;re notified of inappropriate content, we side with the reporter of the
                    content and not the author.
                </p>
                <p className={paragraphStyle}>
                    Even if they are threatening to sue the crap out of us.
                </p>
            </div>
        </div>
    );
}
