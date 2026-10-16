import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initSentry } from "./sentry";

if (import.meta.env.PROD) {
    initSentry();
}

const container = document.getElementById("root");
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
