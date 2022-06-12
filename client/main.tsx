import { createRoot } from "react-dom/client";
import { App } from "./app";

const rootElement = document.createElement("div");

document.documentElement.style.height = "100%";
document.documentElement.style.margin = "0";

document.body.style.height = "100%";
document.body.style.margin = "0";

document.body.appendChild(rootElement);

const root = createRoot(rootElement);
root.render(<App />);
