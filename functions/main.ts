import * as functions from "firebase-functions";
import * as jimp from "jimp";
import { createHash } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";

const app = initializeApp();
const defaultBucket = getStorage(app).bucket();

export const image = functions.https.onRequest((request, response) => {
  // eslint-disable-next-line prefer-named-capture-group
  const regexResult = /image\/(.+)/u.exec(request.path);
  if (regexResult === null) {
    response.send("パスがおかしい " + request.path);
    return;
  }
  defaultBucket.file(regexResult[1]).createReadStream().pipe(response);
});

export const imageNameList = functions.https.onRequest(
  async (request, response) => {
    const files = await defaultBucket.getFiles({});
    response.send(
      JSON.stringify({
        fileNames: files[0].flatMap((file) => {
          return file.name;
        }),
      })
    );
  }
);

export const uploadImage = functions
  .runWith({ memory: "1GB" })
  .https.onRequest(async (request, response) => {
    if (request.method.toUpperCase() !== "POST") {
      response.send("post してね");
      return;
    }
    if (typeof request.body === "string") {
      response.send("string になってる");
      return;
    }
    (await jimp.create(request.body))
      .resize(jimp.AUTO, 64)
      .getBuffer(jimp.MIME_PNG, (error, buffer) => {
        if (error) {
          response.send("リサイズに失敗しました");
        }
        defaultBucket
          .file(createHash("sha256").update(buffer).digest("hex"))
          .save(buffer, { contentType: "image/png" })
          .then(() => {
            response.send("ok");
          });
      });
  });
