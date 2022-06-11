/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import React from "react";
import * as app from "firebase/app";
import * as storage from "firebase/storage";
import targetImage from "../public/woodHouse.png";

const initialize = async (
  setFileUrlList: (newUrlList: ReadonlyArray<URL>) => void,
  storageInstance: storage.FirebaseStorage
): Promise<void> => {
  const ref = storage.ref(storageInstance, "images");

  const loop = async (): Promise<void> => {
    const urlList = await getFileList(storageInstance);

    setFileUrlList(urlList);

    console.log("10秒に一回する処理!", urlList);
  };
  setInterval(loop, 10000);
  loop();

  console.log("初期化しました");
};

const getFileList = async (
  storageInstance: storage.FirebaseStorage
): Promise<ReadonlyArray<URL>> => {
  const ref = storage.ref(storageInstance, "images");

  const k = await storage.listAll(ref);
  return await Promise.all(
    k.items.map(async (l) => {
      const url = await storage.getDownloadURL(
        storage.ref(storageInstance, l.fullPath)
      );
      return new URL(url);
    })
  );
};

const imageColor = (url: string): void => {
  const image = new Image();
  image.onload = () => {
    console.log("画像を読み込めました", image);
    const canvasElement = document.createElement("canvas");
    canvasElement.width = image.width;
    canvasElement.height = image.height;
    const context = canvasElement.getContext("2d") as CanvasRenderingContext2D;

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, image.width, image.height);
    const mainColor = imageDataGetHubModeColor(imageData);
    document.body.style.backgroundColor = `hsl(${mainColor}, 80%, 80%)`;
    console.log({ mainColor });
    canvasElement.style.width = "256px";
    document.body.append(canvasElement);
  };
  image.src = url;
};

const imageDataGetModeColor = (imageData: ImageData): string => {
  const map = new Map<string, number>();
  for (let i = 0; i < imageData.data.length / 4; i += 1) {
    const r = imageData.data[i * 4 + 0];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    const key = rgbToKey(colorToSimple({ r, b, g }));
    const before = map.get(key);
    map.set(key, before === undefined ? 1 : before + 1);
  }
  return maxMapKey(map, new Set()) ?? "#00FF00";
};

const imageDataGetHubModeColor = (imageData: ImageData): number => {
  const map = new Map<number, number>();
  for (let i = 0; i < imageData.data.length / 4; i += 1) {
    const r = imageData.data[i * 4 + 0];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    const key = Math.floor(rgbColorToHue(colorToSimple({ r, b, g })) / 15) * 15;
    const before = map.get(key);
    map.set(key, before === undefined ? 1 : before + 1);
  }
  console.log("map", map);
  return maxMapKey(map, new Set([0])) ?? 23;
};

const maxMapKey = <key,>(
  map: ReadonlyMap<key, number>,
  exclude: ReadonlySet<key>
): key | undefined => {
  return [...map].reduce<
    { readonly key: key; readonly value: number } | undefined
  >((beforeMax, [k, v]) => {
    if (exclude.has(k)) {
      return undefined;
    }
    if (beforeMax === undefined) {
      return { key: k, value: v };
    }
    if (beforeMax.value < v) {
      return { key: k, value: v };
    }
    return beforeMax;
  }, undefined)?.key;
};

const sampleSize = 32;

const colorToSimple = (color: Color): Color => {
  return {
    r: Math.floor(color.r / sampleSize) * sampleSize,
    g: Math.floor(color.g / sampleSize) * sampleSize,
    b: Math.floor(color.b / sampleSize) * sampleSize,
  };
};

const rgbToKey = (color: Color): string => {
  return `#${color.r.toString(16).padStart(2, "0")}${color.g
    .toString(16)
    .padStart(2, "0")}${color.b.toString(16).padStart(2, "0")}`;
};

type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

const imageDataGetAverageColor = (imageData: ImageData): Color => {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  for (let i = 0; i < imageData.data.length / 4; i += 1) {
    const r = imageData.data[i * 4 + 0];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    const a = imageData.data[i * 4 + 3];
    rSum += r;
    gSum += g;
    bSum += b;
  }
  const pixelCount = imageData.width * imageData.height;
  return {
    r: Math.floor(rSum / pixelCount),
    g: Math.floor(gSum / pixelCount),
    b: Math.floor(gSum / pixelCount),
  };
};

type Hsl = {
  readonly hue: number;
  readonly light: number;
};

const rgbToHsl = (color: Color): Hsl => {
  return {
    hue: rgbColorToHue(color),
    light: rgbToLight(color),
  };
};

const rgbColorToHue = (color: Color): number => {
  const rawHue = rgbColorToRawHue(color);
  if (rawHue < 0) {
    return Math.floor(rawHue) + 360;
  }
  return Math.floor(rawHue);
};

const rgbColorToRawHue = (color: Color): number => {
  if (color.g < color.r && color.b < color.r) {
    return 60 * ((color.g - color.b) / (color.r - Math.min(color.g, color.b)));
  }
  if (color.r < color.g && color.b < color.g) {
    return (
      60 * ((color.b - color.r) / (color.g - Math.min(color.r, color.b))) + 120
    );
  }
  if (color.r < color.b && color.g < color.b) {
    return (
      60 * ((color.r - color.g) / (color.b - Math.min(color.r, color.g))) + 240
    );
  }
  return 0;
};

const rgbToLight = (color: Color) => {
  return (
    (Math.max(color.r, color.g, color.b) +
      Math.min(color.r, color.g, color.b)) /
    2
  );
};

const result: ReadonlyArray<{
  readonly path: string;
  readonly averageColor: string;
  readonly modeColor16: string;
  readonly modeColor32: string;
  readonly modeHubNonZero: string;
}> = [
  {
    path: "labyrinth.png",
    averageColor: "#5d6262",
    modeColor16: "#505040",
    modeColor32: "#406080",
    modeHubNonZero: "#a3ccf5",
  },
  {
    path: "garden.png",
    averageColor: "#727474",
    modeColor16: "#506020",
    modeColor32: "#406020",
    modeHubNonZero: "#ccf5a3",
  },
  {
    path: "lavaBridge.png",
    averageColor: "#7e5656",
    modeColor16: "#202020",
    modeColor32: "#202020",
    modeHubNonZero: "#f5b8a3",
  },
  {
    path: "woodHouse.png",
    averageColor: "#6a5454",
    modeColor16: "#403020",
    modeColor32: "#402020",
    modeHubNonZero: "#f5cca3",
  },
];

const Home: NextPage = () => {
  const [fileNameUrl, setFileUrlList] = React.useState<ReadonlyArray<URL>>([]);
  // const [storageInstance] = React.useState<storage.FirebaseStorage | undefined>(
  //   () => {
  //     try {
  //       return storage.getStorage(
  //         app.initializeApp({
  //           apiKey: "AIzaSyASlwb-s10yx934_3z9F84N3eNzxX99FCM",
  //           authDomain: "image-color-canvas-world.firebaseapp.com",
  //           databaseURL: "",
  //           messagingSenderId: "1078278609788",
  //           projectId: "image-color-canvas-world",
  //           storageBucket: "image-color-canvas-world.appspot.com",
  //         })
  //       );
  //     } catch (e) {
  //       console.error("初期化エラー", e);
  //     }
  //   }
  // );

  // React.useEffect(() => {
  //   if (storageInstance !== undefined) {
  //     initialize(setFileUrlList, storageInstance);
  //   }
  // }, [storageInstance]);

  React.useEffect(() => {
    imageColor(targetImage.src);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>image color canvas world</title>
        <meta name="description" content="Generated by create next app" />
      </Head>
      <StyledDiv>背景色 オレンジになったかな</StyledDiv>
      <div>ファイル名たち{JSON.stringify(fileNameUrl)}</div>
      {fileNameUrl.map((url) => (
        <img key={url.toString()} src={url.toString()} alt="" />
      ))}
    </div>
  );
};

const StyledDiv = ({
  children,
}: {
  readonly children: React.ReactElement | string;
}) => <div className={styles.bg}>{children}</div>;

export default Home;
