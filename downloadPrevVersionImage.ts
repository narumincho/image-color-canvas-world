import { ensureFile } from "jsr:@std/fs";

const response: { fileNames: ReadonlyArray<string> } = await (
  (await fetch("https://image-color-canvas-world.web.app/imageNameList"))
    .json()
);

for (const fileName of response.fileNames) {
  const image = await (await fetch(
    `https://image-color-canvas-world.web.app/image/${fileName}`,
  )).arrayBuffer();
  const path = `./image/${fileName}`;
  await ensureFile(path);
  await Deno.writeFile(`./image/${fileName}`, new Uint8Array(image));
}
