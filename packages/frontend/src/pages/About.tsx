export function About() {
    const cardStyle = 'bg-white px-4 py-2 shadow-md border-cal-poly-gold border-2 rounded-md mb-10';
    const paragraphStyle = 'py-[2px]';
    const subTitleStyle = 'text-cal-poly-green font-medium text-center text-3xl mb-2';
    return (
        <div className="container m-auto px-2 md:px-12 max-w-7xl">
            <h1 className="text-4xl text-cal-poly-green mb-7 mt-12 font-semibold pl-1 md:pl-0">
                About Polyratings
            </h1>
            <div className="w-full h-[2px] bg-cal-poly-green mb-7" />

            <div className={cardStyle}>
                <p className={paragraphStyle}>
                    Most people think of the Internet as a mind-boggling network of computers and
                    technology. But the truth is, it&apos;s an unprecedented network of people, more
                    specifically, students. Thousands of students just like you, who have already
                    been where you want to go, or are following a path that you&apos;ve already
                    taken.
                </p>

                <p className={paragraphStyle}>
                    Polyratings.com recognizes that the power of the Internet lies in the students
                    who populate it. If you can imagine a room full of people helping you make
                    decisions on who to take for a class or where the best place to live, then you
                    can imagine a place like Polyratings.
                </p>

                <p className={paragraphStyle}>
                    Polyratings was created by two Cal Poly students over the winter break of 1998,
                    Doug Dahms and Forrest Lanning. The site went on-line on January 9th, 1999.
                    &quot;We just got fed up of taking classes given by lousy professors.&quot;
                    Using Polyratings, a student can warn or recommend others by giving their own
                    evaluation of that professor.
                </p>
            </div>

            <h2 className={subTitleStyle}>Our Beginnings</h2>
            <div className={cardStyle}>
                <p className={paragraphStyle}>
                    In the fall quarter of 1998, Dahms and Lanning, who were roommates, enjoyed
                    creating web pages. They enjoyed working on designing and redesigning various
                    web projects.
                </p>
                <p className={paragraphStyle}>
                    At the same time, Lanning was just starting a course in Physics. He had asked
                    some people about whom he should take before enrolling and they all said
                    &quot;Take professor X; he&apos;s fine, pretty easy&quot; So he enrolled in
                    professor X&apos;s class. Little did he know, professor X was one of the worst
                    on campus.
                </p>
                <p className={paragraphStyle}>
                    Both Lanning and Dahms enjoyed browsing Amazon.com, especially the customer
                    evaluations on the products sold there. While looking at evaluations for a new
                    CD, it clicked: &quot; Why not evaluate our professors?!&quot; Christmas break
                    soon came so the two decided to split up the work and researched it more while
                    at home over the break. Dahms took it upon himself to learn a new programming
                    language, while Lanning went to work designing the interface for their new
                    project.
                </p>
                <p className={paragraphStyle}>
                    After the break, Lanning came back to school with Shaman an old hand-me-down PC
                    with a hard drive so loud that it kept Dahms and Lanning awake in their small
                    dorm room at night. New life was breathed into Shaman when Linux, a Unix-clone
                    operating system, was installed on it. Together with Shaman serving webpages and
                    the network connection provided by Cal Poly at the time, they were able to host
                    the first version of Polyratings.
                </p>

                <p className={paragraphStyle}>
                    The two were able to get the site up and working within the first two weeks of
                    the winter quarter. But Lanning and Dahms knew the site would be useless without
                    any publicity. So Lanning e-mailed Cal Poly&apos;s student newspaper, the
                    Mustang Daily, sparking interest in the site. This led to the first of a number
                    of articles about the controvertial, but always popular website.
                </p>

                <p className={paragraphStyle}>
                    After the article ran, people flooded to the website. Both students and Cal Poly
                    University administrators came to see what all the excitement was about.
                    Initially, administrators were worried about this type of information being
                    widely available. But most importantly, they were worried about not having
                    control over a system like Polyratings.
                </p>

                <p className={paragraphStyle}>
                    The University soon tried to stop Dahms and Lanning from hosting the site.
                    Administrators threatened them with loss of their dorm housing if they
                    didn&apos;t pull the plug on Polyratings. But the site had become too popular
                    among Cal Poly students to simply take Polyratings down forever. Hassles from
                    the University administration mysteriously stopped when a reporter for the Los
                    Angeles Times contacted the campus&apos; Chief Information Officer, who then
                    misrepresented the university&apos;s prior position by incorrectly stating
                    &quot;Nobody who works for me felt this was an inappropriate use.&quot;
                </p>
                <p className={paragraphStyle}>
                    Ultimately, Dahms and Lanning would appear on the local news and in a number of
                    newspapers and mazaines, including the Japan Times, People, and the Christian
                    Science Monitor. The two never expected any publicity from their little
                    &quot;project&quot;, but it has happened and it was quite the rollercoaster
                    experience.
                </p>
            </div>

            <h2 className={subTitleStyle}>Polyratings 2.0</h2>
            <div className={cardStyle}>
                <p className={paragraphStyle}>
                    In the spring of 2001, J. Paul Reed approached Lanning about updating the
                    Polyratings rating engine. Reed had previously worked with Polyratings on such
                    projects as POWERatings, but found the 1.0 Polyratings system difficult to
                    integrate other projects with.
                </p>
                <p className={paragraphStyle}>
                    Reed proposed a number of new features for the Polyratings backend, including a
                    database-driven ratings engine which would not only support a number of new
                    search options, but give Polyratings the power to support complex queries and
                    data mining on the information already in the Polyratings 1.0 database. With
                    Polyratings 2.0, students can now search for the best professors by name, class,
                    or keywords, allowing the information contained in some 4000 ratings to be
                    unleashed and used in new ways.
                </p>
                <p className={paragraphStyle}>
                    Having already implemented and supported complex web-based applications,
                    including the popular Cal Poly Robot-Assisted Scheduling Helper (CRASH),
                    POWERatings, and POWERTime, Reed became the Chief Software Architect for
                    Polyratings 2.0. Starting in July of 2001, Reed worked to safely import over
                    4000 ratings on over 750 professors from the Polyratings 1.0 database into the
                    new Polyratings 2.0 database. The task proved difficult because data from the
                    old ratings engine was not complete for every rating submitted. The import alone
                    took two weeks; another three weeks was spent writing a new engine to support
                    access to this awesome new tool for Cal Poly students.
                </p>
                <p className={paragraphStyle}>
                    Polyratings 2.0 was officially launched, with a new database, a new ratings
                    engine, and a new look provided by Lanning, on August 19th, 2001. With the
                    extensibility of a complete web framework, and modualarized ratings engine, and
                    a fully SQL-capable database, Polyratings 2.0 is able to analyze and present
                    information regarding Poly&apos;s best (and worst) professors to the weary
                    student faster, easier, and with more value so students can be empowered to make
                    the necessary decisions to make the most of their education.
                </p>
            </div>

            <h2 className={subTitleStyle}>Polyratings 3.0</h2>
            <div className={cardStyle}>
                <p className={paragraphStyle}>
                    Over the 14 years this site has been around for before 2016, its been viewed 2.5
                    million times! With the average student population on Cal Poly campus around
                    20,000, that is a huge achievement for the site. This being said, when class
                    registration came around every quarter there was always talk about the
                    Polyratings scores for professors. However, with this talk also came much
                    negativity towards the site. With this realization Connor Krier, Cody Sears, and
                    Anil Thattayathu started their senior project to figure where this negativity
                    stemmed from and what they can do to fix it.
                </p>
                <p className={paragraphStyle}>
                    The problem that they found was that everyone needed Polyratings for help with
                    class searching, but were also very dissatisfied with the website. The main
                    problems with the website were that the User Interface (UI) was not up to date
                    and was cumbersome, as well as there being some troubles with the data in the
                    website.
                </p>
                <p className={paragraphStyle}>
                    They sought out to solve these issues over the course of their senior project.
                    To do this they came up with a new layout using bootstrap to bring the page up
                    to date and make it responsive. That&apos;s right! In a day an age where we
                    access the internet over our phones, Polyratings is still here to help you know
                    what your in for.
                </p>
            </div>
        </div>
    );
}
