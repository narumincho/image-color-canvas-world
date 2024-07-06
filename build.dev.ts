import { createServer } from "npm:vite";
import { config } from "./build.config.ts";

const server = await createServer(config);
await server.listen();
server.printUrls();
