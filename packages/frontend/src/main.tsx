import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Modal from "react-modal";
import App from "./App";

Modal.setAppElement("#root");

const container = document.getElementById("root");
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
