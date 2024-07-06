import solidPlugin from "npm:vite-plugin-solid";
import { pluginDeno } from "jsr:@deno-plc/vite-plugin-deno";
import { type InlineConfig } from "npm:vite";

export const config: InlineConfig = {
  configFile: false,
  server: {
    port: 80,
  },
  plugins: [
    solidPlugin(),
    await pluginDeno(),
  ],
};
