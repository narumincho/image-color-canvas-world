import { renderToString } from "npm:preact-render-to-string";
import { h } from "https://esm.sh/preact@10.22.1?pin=v135";
import dist from "./dist.json" with { type: "json" };
import { S3Client } from "jsr:@bradenmacdonald/s3-lite-client";
import { delay } from "jsr:@std/async/delay";
import sharp from "npm:sharp";
import { encodeHex } from "jsr:@std/encoding@^0.223.0/hex";

const getR2Client = (r2SecretAccessKey: string): S3Client => {
  return new S3Client({
    endPoint: "6a8354084cc02bb1c5f9ca1bb3442704.r2.cloudflarestorage.com",
    region: "auto",
    accessKey: "5a92072e46e542f16f9ebcfee76d98b1",
    bucket: "image-color-canvas-world",
    secretKey: r2SecretAccessKey,
  });
};

export const main = async (props: {
  readonly r2SecretAccessKey: string;
}): Promise<void> => {
  Deno.serve(async (request) => {
    const pathname = new URL(request.url).pathname;
    switch (pathname) {
      case "/":
        return new Response(
          "<!doctype html>" + renderToString(
            <html>
              <head>
                <meta charset="UTF-8" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1.0"
                />
                <title>image color canvas world</title>
                <link rel="stylesheet" href={`/${dist.styleCssHash}`} />
                <script type="module" src={`/${dist.clientCodeHash}`} />
              </head>
              <body />
            </html>,
          ),
          {
            headers: { "content-type": "text/html" },
          },
        );
      case `/${dist.clientCodeHash}`:
        return new Response(dist.clientCode, {
          headers: { "content-type": "application/javascript" },
        });
      case `/${dist.styleCssHash}`:
        return new Response(dist.styleCss, {
          headers: { "content-type": "text/css" },
        });
      case "/imageUrls": {
        const r2 = getR2Client(props.r2SecretAccessKey);

        const urls: string[] = [];
        for await (const file of r2.listObjects({ prefix: "minify/" })) {
          urls.push(
            file.key.replace(/^minify\//, `/image/`),
          );
        }
        return new Response(JSON.stringify({ urls }), {
          headers: { "content-type": "application/json" },
        });
      }
      case "/uploadUrl": {
        const r2 = getR2Client(props.r2SecretAccessKey);

        const path = `upload/${crypto.randomUUID()}`;
        const url = await r2.getPresignedUrl(
          "PUT",
          path,
          { expirySeconds: 60 },
        );

        await kv.enqueue(
          {
            type: "checkUpload",
            path,
            expiresAt: new Date().getTime() + 1000 * 60,
          } satisfies Message,
        );

        return new Response(JSON.stringify({ url }), {
          headers: { "content-type": "application/json" },
        });
      }
      default: {
        if (pathname.startsWith("/image/")) {
          const r2 = getR2Client(props.r2SecretAccessKey);
          const path = pathname.replace(/^\/image\//, "");
          try {
            return Response.redirect(
              await r2.getPresignedUrl("GET", `minify/${path}`),
            );
            // const response = await (await r2.getObject(`minify/${path}`))
            //   .arrayBuffer();
            // return new Response(response, {
            //   headers: { "content-type": "image/png" },
            // });
          } catch (e) {
            if (
              e instanceof Error &&
              e.message.includes("The specified key does not exist")
            ) {
              return new Response("Not Found", { status: 404 });
            }
            throw e;
          }
        }
        return new Response("Not Found", { status: 404 });
      }
    }
  });

  const kv = await Deno.openKv();

  kv.listenQueue(async (message: Message) => {
    console.log("message", message);
    if (message.expiresAt < new Date().getTime()) {
      console.log("expired");
      return;
    }
    await delay(2000);
    const r2 = getR2Client(props.r2SecretAccessKey);
    try {
      const response = await (await r2.getObject(message.path)).arrayBuffer();
      const newImage = await sharp(response).resize(undefined, 64).png()
        .toBuffer();
      const imageHash = encodeHex(
        await crypto.subtle.digest("SHA-256", newImage),
      );
      console.log("imageHash", imageHash);
      await r2.putObject(`minify/${imageHash}`, newImage, {
        metadata: { "Content-Type": "image/png" },
      });
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("The specified key does not exist")
      ) {
        await kv.enqueue(
          {
            type: "checkUpload",
            path: message.path,
            expiresAt: message.expiresAt,
          } satisfies Message,
        );
      } else {
        throw e;
      }
    }
  });
};

type Message = {
  readonly type: "checkUpload";
  readonly path: string;
  readonly expiresAt: number;
};
