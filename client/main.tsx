import { App } from "./app";
import { render } from "solid-js/web";

const rootElement = document.createElement("div");

document.documentElement.style.height = "100%";
document.documentElement.style.margin = "0";

document.body.style.height = "100%";
document.body.style.margin = "0";

document.body.appendChild(rootElement);

render(<App />, rootElement);
