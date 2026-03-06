import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { fontFamily } from "./theme/typography";

if (typeof document !== "undefined") {
  document.documentElement.style.setProperty("--app-font-family", fontFamily.primary);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
