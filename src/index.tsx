import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import {HighlighterProvider} from "./store/HighlightContext";

// Inject Material Icons stylesheet
const link = document.createElement("link");
link.href =
  "https://unpkg.com/@material-tailwind/html@latest/styles/material-tailwind.css";

link.rel = "stylesheet";
const tailwind = document.createElement("script");
tailwind.src =
  "https://unpkg.com/@material-tailwind/html@latest/scripts/script-name.js";
document.head.appendChild(link);

const materialIcons = document.createElement("link");
materialIcons.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
materialIcons.rel = "stylesheet";
document.head.appendChild(materialIcons);

// Then inject your React component...
// ... your code for injecting the React component

const root = document.createElement("div");
root.id = "react-root";

document.body.appendChild(root);
// const  shado

const rootDiv = ReactDOM.createRoot(root);

rootDiv.render(
  <React.StrictMode>
    <HighlighterProvider>
      <App />
    </HighlighterProvider>
  </React.StrictMode>
);
