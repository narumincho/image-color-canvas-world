import {
  createServer,
  request as httpRequest,
  IncomingMessage,
  ServerResponse,
} from "http";
import { readFile } from "fs/promises";

const server = createServer((request, response) => {
  (async () => {
    const firebaseJson: {
      readonly hosting: {
        readonly rewrites: ReadonlyArray<{
          readonly source: string;
          readonly function: string;
        }>;
      };
      readonly emulators: {
        readonly hosting: {
          readonly port: number;
        };
      };
    } = JSON.parse(new TextDecoder().decode(await readFile("./firebase.json")));
    const path = request.url;
    if (path === undefined) {
      response.end("invalid path?");
      return;
    }
    for (const rewrite of firebaseJson.hosting.rewrites) {
      if (glob(rewrite.source, path)) {
        proxy({
          portNumber: firebaseJson.emulators.hosting.port,
          request,
          response,
        });
        return;
      }
    }
    proxy({
      // parcel port
      portNumber: 1234,
      request,
      response,
    });
  })();
});

const proxyPortNumber = 5002;

server.listen(5002, () => {
  console.log(
    `proxy サーバーを起動できたぞ! http://localhost:${proxyPortNumber}`
  );
});

const proxy = (parameter: {
  readonly portNumber: number;
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
}): void => {
  const functionRequest = httpRequest(
    {
      hostname: `localhost`,
      port: parameter.portNumber,
      method: parameter.request.method,
      path: parameter.request.url,
      headers: parameter.request.headers,
    },
    (functionResponse) => {
      functionResponse.on("data", (data) => {
        parameter.response.write(data);
      });
      functionResponse.on("end", () => {
        parameter.response.end();
      });
    }
  );
  parameter.request.on("data", (data) => {
    functionRequest.write(data);
  });
  parameter.request.on("end", () => {
    functionRequest.end();
  });
};

const glob = (pattern: string, input: string): boolean => {
  var re = new RegExp(
    pattern.replace(/([.?+^$[\]\\(){}|\/-])/g, "\\$1").replace(/\*/g, ".*")
  );
  return re.test(input);
};
