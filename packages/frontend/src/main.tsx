import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import Modal from "react-modal";
import App from "./App";

Modal.setAppElement("#root");

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById("root"),
);
