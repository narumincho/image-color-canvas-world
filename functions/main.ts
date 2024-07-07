import * as functions from "firebase-functions";
import * as jimp from "jimp";
import { createHash } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";

const app = initializeApp();
const defaultBucket = getStorage(app).bucket();

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
