import { encodeHex } from "jsr:@std/encoding/hex";
import { bundle } from "jsr:@deno/emit@0.43.1";

const clientCode = (await bundle("./client/main.tsx", {
  compilerOptions: {
    jsxFactory: "h",
  },
})).code;
const styleCss = await Deno.readTextFile("./client/style.css");

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
    styleCss,
    styleCssHash: encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(styleCss),
      ),
    ),
  }),
);
