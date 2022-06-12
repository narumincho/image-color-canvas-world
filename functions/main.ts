import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";

const app = initializeApp();
const defaultBucket = getStorage(app).bucket();

export const image = functions.https.onRequest(async (request, response) => {
  console.log(request.path);
  defaultBucket.file(request.path.slice(1)).createReadStream().pipe(response);
});
