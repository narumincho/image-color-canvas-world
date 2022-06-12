import React from "react";

type ImageColorAndUrlData = {
  readonly url: string;
  readonly hue: number;
  readonly light: number;
  readonly heightPerWidth: number;
};

const initialize = async (
  setFileUrlList: (newUrlList: ReadonlyArray<ImageColorAndUrlData>) => void
): Promise<void> => {
  const loop = async (): Promise<void> => {
    const urlList = await getFileList();

    setFileUrlList(
      await Promise.all(
        urlList.map<Promise<ImageColorAndUrlData>>((url) => {
          return getImageMainColor(url);
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

const cache = new Map<string, ImageColorAndUrlData>();

const getImageMainColor = (url: string): Promise<ImageColorAndUrlData> =>
  new Promise((resolve) => {
    const resultFromCache = cache.get(url);
    if (resultFromCache !== undefined) {
      resolve(resultFromCache);
    }
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
      const result = {
        url: url,
        hue: mainHue,
        light: imageDataGetModeLight(imageData),
        heightPerWidth: imageData.height / imageData.width,
      };
      cache.set(url, result);
      resolve(result);
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

export const App = (): React.ReactElement => {
  const [fileNameUrl, setFileUrlList] = React.useState<
    ReadonlyArray<ImageColorAndUrlData>
  >([]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    initialize(setFileUrlList);
  }, []);

  return (
    <div className="container">
      <svg viewBox="0 0 360 100" className="mainView">
        {fileNameUrl.map((urlAndColor) => {
          const height = 20;
          const width = 20 / urlAndColor.heightPerWidth;
          const x = urlAndColor.hue - width / 2;
          const y = urlAndColor.light * 100 - height / 2;
          return (
            <g key={urlAndColor.url}>
              <rect
                key={urlAndColor.url}
                fill={`hsl(${urlAndColor.hue}, 80%, ${Math.floor(
                  urlAndColor.light * 100
                )}%)`}
                x={x - 1}
                y={y - 1}
                width={width + 2}
                height={height + 2}
              />
              <image
                href={urlAndColor.url}
                x={x}
                y={y}
                width={width}
                height={height}
              />
            </g>
          );
        })}
      </svg>
      <input
        className="fileInput"
        type="file"
        accept="image/png, image/jpeg"
        multiple
        onInput={(e) => {
          const files = e.currentTarget.files;
          if (files === null) {
            return;
          }
          [...files].map(async (file) => {
            fetch("/uploadImage", {
              method: "POST",
              body: await file.arrayBuffer(),
              headers: new Headers({
                "content-type": file.type,
              }),
            }).then(() => {
              console.log("ok");
            });
          });

          console.log("ファイルを入力した", e);
        }}
      />
    </div>
  );
};
