import * as firebaseJson from "./firebase.json";
import {
  IncomingMessage,
  ServerResponse,
  createServer,
  request as httpRequest,
} from "http";

const server = createServer((request, response) => {
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
    // vite port
    portNumber: 3000,
    request,
    response,
  });
});

const proxyPortNumber = 5002;

server.listen(proxyPortNumber, () => {
  console.log(
    `proxy サーバーを起動できたぞ! http://localhost:${proxyPortNumber}`
  );
});

const proxy = (parameter: {
  readonly portNumber: number;
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
}): void => {
  const innerRequest = httpRequest(
    {
      hostname: `localhost`,
      port: parameter.portNumber,
      method: parameter.request.method,
      path: parameter.request.url,
      headers: parameter.request.headers,
    },
    (innerResponse) => {
      for (const [headerKey, headerValue] of Object.entries(
        innerResponse.headers
      )) {
        if (headerValue !== undefined) {
          parameter.response.setHeader(headerKey, headerValue);
        }
      }
      innerResponse.on("data", (data) => {
        parameter.response.write(data);
      });
      innerResponse.on("end", () => {
        parameter.response.end();
      });
    }
  );
  parameter.request.on("data", (data) => {
    innerRequest.write(data);
  });
  parameter.request.on("end", () => {
    innerRequest.end();
  });
};

const glob = (pattern: string, input: string): boolean => {
  // eslint-disable-next-line require-unicode-regexp
  const regex = new RegExp(
    // eslint-disable-next-line prefer-named-capture-group
    pattern.replace(/([.?+^$[\]\\(){}|/-])/gu, "\\$1").replace(/\*/gu, ".*")
  );
  return regex.test(input);
};
