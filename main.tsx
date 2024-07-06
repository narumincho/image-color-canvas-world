import { renderToString } from "npm:preact-render-to-string";
import { h } from "https://esm.sh/preact@10.22.1?pin=v135";
import dist from "./dist.json" with { type: "json" };

Deno.serve((request) => {
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
    default:
      return new Response("Not Found", { status: 404 });
  }
});
