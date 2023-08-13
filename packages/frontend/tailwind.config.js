const { join } = require("path");
const { createGlobPatternsForDependencies } = require("@nx/react/tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
    // https://nx.dev/recipes/other/using-tailwind-css-in-react#introducing-nx-utility-for-better-tailwind-purging
    content: [
        join(__dirname, "{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}"),
        ...createGlobPatternsForDependencies(__dirname),
    ],
    theme: {
        fontFamily: {
            nunito: ["Nunito"],
        },
        borderWidth: {
            DEFAULT: "0.0625rem",
            0: "0",
            2: "0.125rem",
            4: "0.25rem",
            8: "0.5rem",
        },
        extend: {
            colors: {
                "cal-poly-green": "#1F4715",
                "cal-poly-light-green": "#D7EACE",
                "cal-poly-gold": "#BD8B13",
            },
            height: () => ({
                "screen/2": "50vh",
                "screen/3": "calc(100vh / 3)",
                "screen/4": "calc(100vh / 4)",
                "screen/5": "calc(100vh / 5)",
                "screen3/5": "calc(100vh / 5 * 3)",
                "screen4/5": "calc(100vh / 5 * 4)",
                screenWoNav: "calc(100vh - 3rem)",
            }),
            screens: {
                m2xl: { max: "1535px" },
                mxl: { max: "1279px" },
                mlg: { max: "1023px" },
                mmd: { max: "767px" },
                msm: { max: "639px" },
            },
            maxHeight: {
                0: "0",
                "1/4": "25%",
                "1/2": "50%",
                "3/4": "75%",
                "10/12": "83%",
                full: "100%",
            },
            minHeight: {
                screenWoNav: "calc(100vh - 3rem)",
            },
            minWidth: {
                0: "0",
                "1/4": "25%",
                "1/2": "50%",
                "3/4": "75%",
                "10/12": "83%",
                full: "100%",
            },
        },
    },
    // eslint-disable-next-line global-require
    plugins: [require("tailwind-scrollbar-hide")],
};
