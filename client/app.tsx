import { h, JSX } from "https://esm.sh/preact@10.22.1?pin=v135";
import { useState } from "https://esm.sh/preact@10.22.1/hooks?pin=v135";

type ImageColorAndUrlData = {
  readonly url: string;
  readonly hue: number;
  readonly light: number;
  readonly heightPerWidth: number;
};

const appDomId = "image-color-canvas-world-app";

const handleResizeApp = (setAppHeightPerWidth: (n: number) => void) => {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      setAppHeightPerWidth(
        entry.target.clientHeight / entry.target.clientWidth,
      );
    }
  });
  const appDomElement = document.getElementById(appDomId);
  if (appDomElement !== null) {
    resizeObserver.observe(appDomElement);
    return;
  }
  console.log("domから取得できず");
};

const initialize = (
  setFileUrlList: (v: ReadonlyArray<ImageColorAndUrlData>) => void,
  setAppHeightPerWidth: (n: number) => void,
): () => void => {
  const getFiles = async (): Promise<void> => {
    const urlList = await getFileList();

    setFileUrlList(
      await Promise.all(
        urlList.map<Promise<ImageColorAndUrlData>>((url) => {
          return getImageMainColor(url);
        }),
      ),
    );

    console.log("10秒に一回する処理!", urlList);
  };
  setInterval(getFiles, 10000);
  getFiles();
  setTimeout(() => {
    handleResizeApp(setAppHeightPerWidth);
  }, 0);

  console.log("初期化しました");

  return getFiles;
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
      return;
    }
    const image = new Image();
    image.onload = () => {
      console.log("画像を読み込めました", image);
      const canvasElement = document.createElement("canvas");
      canvasElement.width = image.width;
      canvasElement.height = image.height;
      const context = canvasElement.getContext(
        "2d",
      ) as CanvasRenderingContext2D;

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, image.width, image.height);
      const mainHue = imageDataGetModeHue(imageData);
      const result = {
        url,
        hue: mainHue,
        light: imageDataGetModeLight(imageData),
        heightPerWidth: imageData.height / imageData.width,
      };
      cache.set(url, result);
      resolve(result);
    };
    image.src = url;
  });

const imageDataGetModeHue = (imageData: ImageData): number => {
  const map = new Map<number, number>();
  for (let i = 0; i < imageData.data.length / 4; i += 1) {
    const r = imageData.data[i * 4 + 0] as number;
    const g = imageData.data[i * 4 + 1] as number;
    const b = imageData.data[i * 4 + 2] as number;
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
    const r = imageData.data[i * 4 + 0] as number;
    const g = imageData.data[i * 4 + 1] as number;
    const b = imageData.data[i * 4 + 2] as number;
    lightSum += rgbToLight({ r, b, g });
  }
  const pixelCount = imageData.width * imageData.height;
  const light = lightSum / pixelCount;
  console.log({ light });
  return light;
};

const maxMapKey = <key,>(
  map: ReadonlyMap<key, number>,
  exclude: ReadonlySet<key>,
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

type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
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

type UploadingState =
  | {
    readonly type: "uploading";
    readonly current: number;
    readonly all: number;
  }
  | {
    readonly type: "none";
  }
  | {
    readonly type: "complete";
    readonly fileCount: number;
  };

const getUploadingMessage = (uploadingState: UploadingState): string => {
  switch (uploadingState.type) {
    case "uploading":
      return (
        "アップロード中... " +
        uploadingState.current.toString() +
        "/" +
        uploadingState.all.toString()
      );
    case "none":
      return "";
    case "complete":
      return (
        uploadingState.fileCount.toString() + "つの画像をアップロードしました"
      );
  }
};

export const App = (): JSX.Element => {
  const [fileNameUrl, setFileUrlList] = useState<
    ReadonlyArray<ImageColorAndUrlData>
  >([]);
  const [uploadingState, setUploadingState] = useState<UploadingState>({
    type: "none",
  });
  const [appHeightPerWidth, setAppHeightPerWidth] = useState<number>(1);

  const getFiles = initialize(setFileUrlList, setAppHeightPerWidth);

  const onInputFile: JSX.DOMAttributes<HTMLInputElement>["onInput"] = (e) => {
    const files = e.currentTarget.files;
    if (files === null) {
      return;
    }
    setUploadingState({
      type: "uploading",
      current: 0,
      all: files.length,
    });
    Promise.all(
      [...files].map(async (file) => {
        return fetch("/uploadImage", {
          method: "POST",
          body: await file.arrayBuffer(),
          headers: new Headers({
            "content-type": file.type,
          }),
        }).then(() => {
          setUploadingState((before) => {
            if (before.type !== "uploading") {
              return before;
            }
            return {
              type: "uploading",
              all: before.all,
              current: before.current + 1,
            };
          });

          console.log("ok");
        });
      }),
    ).then(() => {
      setUploadingState((before) => ({
        type: "complete",
        fileCount: before.type === "uploading" ? before.all : -1,
      }));
      getFiles();
    });
  };

  const calcY = (light: number, height: number): number => {
    return (1 - light) * 360 * appHeightPerWidth - height / 2;
  };

  return (
    <div class="container" id={appDomId}>
      <svg
        viewBox={"0 0 360 " + (360 * appHeightPerWidth).toString()}
        class="mainView"
      >
        {fileNameUrl.map((item) => {
          const height = 20;
          const width = 20 / item.heightPerWidth;
          const x = item.hue - width / 2;
          return (
            <g>
              <rect
                fill={`hsl(${item.hue}, 80%, ${
                  Math.floor(
                    item.light * 100,
                  )
                }%)`}
                x={x - 1}
                y={calcY(item.light, height) - 1}
                width={width + 2}
                height={height + 2}
              />
              <image
                href={item.url}
                x={x}
                y={calcY(item.light, height)}
                width={width}
                height={height}
              />
            </g>
          );
        })}
      </svg>
      <div class="fileInputContainer">
        {uploadingState.type !== "uploading" &&
            !window.location.hash.includes("hide")
          ? (
            <input
              class="fileInput"
              type="file"
              accept="image/png, image/jpeg"
              multiple
              onInput={onInputFile}
            />
          )
          : undefined}

        <div class="message">{getUploadingMessage(uploadingState)}</div>
      </div>
    </div>
  );
};
