import * as esBuild from "npm:esbuild";
import { encodeHex } from "jsr:@std/encoding/hex";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import { solidPlugin } from "npm:esbuild-plugin-solid";

const buildMainJs = async (): Promise<string> => {
  const esbuildResult = await esBuild.build({
    entryPoints: ["./client/app.tsx"],
    plugins: [...denoPlugins(), solidPlugin()],
    write: false,
    bundle: true,
    format: "cjs",
    target: ["node20"],
  });

  for (const esbuildResultFile of esbuildResult.outputFiles ?? []) {
    if (esbuildResultFile.path === "<stdout>") {
      console.log("js 発見");
      const scriptContent = new TextDecoder().decode(
        esbuildResultFile.contents,
      );

      return scriptContent;
    }
  }
  throw new Error("esbuild で <stdout> の出力を取得できなかった...");
};

const clientCode = await buildMainJs();

await Deno.writeTextFile(
  "./dist.json",
  JSON.stringify({
    clientCode,
    clientCodeHash: encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(clientCode),
      ),
    ),
  }),
);

await esBuild.stop();
