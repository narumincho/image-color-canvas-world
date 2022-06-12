/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import React from "react";

const initialize = async (
  setFileUrlList: (
    newUrlList: ReadonlyArray<{
      readonly url: string;
      readonly hue: number;
      readonly light: number;
    }>
  ) => void
): Promise<void> => {
  const loop = async (): Promise<void> => {
    const urlList = await getFileList();

    setFileUrlList(
      await Promise.all(
        urlList.map(async (url) => {
          const colorData = await getImageMainColor(url);
          return {
            hue: colorData.hue,
            light: colorData.light,
            url: url,
          };
        })
      )
    );

    console.log("10秒に一回する処理!", urlList);
  };
  setInterval(loop, 10000);
  loop();

  console.log("初期化しました");
};

const getFileList = async (): Promise<ReadonlyArray<string>> => {
  const response = await fetch("/imageNameList");
  const result = (await response.json()) as {
    readonly fileNames: ReadonlyArray<string>;
  };
  return result.fileNames.map((fileName) => `/image/${fileName}`);
};

const getImageMainColor = (
  url: string
): Promise<{ readonly hue: number; readonly light: number }> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      console.log("画像を読み込めました", image);
      const canvasElement = document.createElement("canvas");
      canvasElement.width = image.width;
      canvasElement.height = image.height;
      const context = canvasElement.getContext(
        "2d"
      ) as CanvasRenderingContext2D;

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, image.width, image.height);
      const mainHue = imageDataGetModeHue(imageData);
      resolve({
        hue: mainHue,
        light: imageDataGetModeLight(imageData),
      });
    };
    image.src = url;
  });

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

const imageDataGetModeHue = (imageData: ImageData): number => {
  const map = new Map<number, number>();
  for (let i = 0; i < imageData.data.length / 4; i += 1) {
    const r = imageData.data[i * 4 + 0];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    const key = Math.floor(rgbColorToHue({ r, b, g }) / 10) * 10;
    const before = map.get(key);
    map.set(key, before === undefined ? 1 : before + 1);
  }
  console.log("map", map);
  return maxMapKey(map, new Set([0])) ?? 23;
};

const imageDataGetModeLight = (imageData: ImageData): number => {
  let lightSum = 0;
  for (let i = 0; i < imageData.data.length / 4; i += 1) {
    const r = imageData.data[i * 4 + 0];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    lightSum += rgbToLight({ r, b, g });
  }
  const pixelCount = imageData.width * imageData.height;
  const light = lightSum / pixelCount;
  console.log({ light });
  return light;
};

const maxMapKey = <key,>(
  map: ReadonlyMap<key, number>,
  exclude: ReadonlySet<key>
): key | undefined => {
  return [...map].reduce<
    { readonly key: key; readonly value: number } | undefined
  >((beforeMax, [k, v]) => {
    if (exclude.has(k)) {
      return beforeMax;
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

const rgbToLight = (color: Color): number => {
  return (
    (Math.max(color.r, color.g, color.b) +
      Math.min(color.r, color.g, color.b)) /
    2 /
    256
  );
};

const result: ReadonlyArray<{
  readonly path: string;
  readonly averageColor: string;
  readonly modeColor16: string;
  readonly modeColor32: string;
  readonly modeHubNonZero: string;
  readonly modeHubWithLight?: string;
}> = [
  {
    path: "labyrinth.png",
    averageColor: "#5d6262",
    modeColor16: "#505040",
    modeColor32: "#406080",
    modeHubNonZero: "#a3ccf5",
    modeHubWithLight: "#1361ae",
  },
  {
    path: "garden.png",
    averageColor: "#727474",
    modeColor16: "#506020",
    modeColor32: "#406020",
    modeHubNonZero: "#ccf5a3",
    modeHubWithLight: "#7eb314",
  },
  {
    path: "lavaBridge.png",
    averageColor: "#7e5656",
    modeColor16: "#202020",
    modeColor32: "#202020",
    modeHubNonZero: "#f5b8a3",
    modeHubWithLight: "#a12a12",
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
  const [fileNameUrl, setFileUrlList] = React.useState<
    ReadonlyArray<{
      readonly url: string;
      readonly hue: number;
      readonly light: number;
    }>
  >([]);

  React.useEffect(() => {
    initialize(setFileUrlList);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>image color canvas world</title>
        <meta name="description" content="Generated by create next app" />
      </Head>
      <svg viewBox="0 0 360 100" className={styles.mainView}>
        {fileNameUrl.map((urlAndColor) => {
          const x = urlAndColor.hue;
          const y = urlAndColor.light * 100;
          return (
            <g key={urlAndColor.url}>
              <rect
                key={urlAndColor.url}
                fill={`hsl(${urlAndColor.hue}, 80%, ${Math.floor(
                  urlAndColor.light * 100
                )}%)`}
                x={x - 1}
                y={y - 1}
                width={10 + 1}
                height={10 + 1}
              />
              <image
                href={urlAndColor.url}
                x={x}
                y={y}
                width={10}
                height={10}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default Home;
