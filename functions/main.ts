import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import * as jimp from "jimp";

const app = initializeApp();
const defaultBucket = getStorage(app).bucket();

export const image = functions.https.onRequest(async (request, response) => {
  const regexResult = /image\/(.+)/u.exec(request.path);
  if (regexResult === null) {
    response.send("パスがおかしい " + request.path);
    return;
  }
  defaultBucket
    .file("images/" + regexResult[1])
    .createReadStream()
    .pipe(response);
});

export const uploadImage = functions.https.onRequest(
  async (request, response) => {
    if (request.method.toUpperCase() !== "POST") {
      response.send("post してね");
      return;
    }
    if (typeof request.body === "string") {
      response.send("string になってる");
      return;
    }
    (await jimp.create(request.body))
      .resize(jimp.AUTO, 512)
      .getBuffer(jimp.MIME_PNG, (error, buffer) => {
        if (error) {
          response.send("リサイズに失敗しました");
        }
        defaultBucket
          .file(request.path.slice(1))
          .save(buffer, { contentType: "image/png" })
          .then(() => {
            response.send("ok");
          });
      });
  }
);
