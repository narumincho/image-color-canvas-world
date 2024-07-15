import { App } from "./app.tsx";
import { h, render } from "https://esm.sh/preact@10.22.1?pin=v135";

const rootElement = document.createElement("div");

document.body.appendChild(rootElement);

render(<App />, rootElement);

console.log("loaded");
