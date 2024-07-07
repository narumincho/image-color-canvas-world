import { renderToString } from "npm:preact-render-to-string";
import { h } from "https://esm.sh/preact@10.22.1?pin=v135";
import dist from "./dist.json" with { type: "json" };
import { S3Client } from "jsr:@bradenmacdonald/s3-lite-client";

export const main = (props: {
  readonly r2SecretAccessKey: string;
}) => {
  Deno.serve(async (request) => {
    switch (new URL(request.url).pathname) {
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
      case "/imageNameList": {
        const s3 = new S3Client({
          endPoint:
            "image-color-canvas-world.6a8354084cc02bb1c5f9ca1bb3442704.eu.r2.cloudflarestorage.com",
          region: "us-east-1",
          accessKey: "5a92072e46e542f16f9ebcfee76d98b1",
          bucket: "image-color-canvas-world",
          secretKey: props.r2SecretAccessKey,
          // accessKeyID: "5a92072e46e542f16f9ebcfee76d98b1",
          // endpointURL:
          //   // "https://6a8354084cc02bb1c5f9ca1bb3442704.r2.cloudflarestorage.com",
          //   "https://6a8354084cc02bb1c5f9ca1bb3442704.eu.r2.cloudflarestorage.com",
          // region: "us-east-1",
          // // bucket: "image-color-canvas-world",
          // bucket: "6a8354084cc02bb1c5f9ca1bb3442704",
          // secretKey: props.r2SecretAccessKey,
        });

        for await (const file of s3.listObjects()) {
          console.log(file);
        }
        return new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
        });
      }
      default:
        return new Response("Not Found", { status: 404 });
    }
  });
};
