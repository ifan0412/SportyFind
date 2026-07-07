export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((file) => resolve(file), "image/jpeg", 0.92);
  });
}

export function compressImage(file: File | Blob, maxDim = 1200): Promise<File> {
  return new Promise((resolve) => {
    if (file.size <= 1.5 * 1024 * 1024 && file instanceof File) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file instanceof File ? file : new File([file], "image.jpg", { type: "image/jpeg" }));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file instanceof File ? file : new File([file], "image.jpg", { type: "image/jpeg" }));
              return;
            }
            resolve(
              new File([blob], file instanceof File ? file.name : "cropped.jpg", {
                type: "image/jpeg",
              })
            );
          },
          "image/jpeg",
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function cropImageToFile(
  imageSrc: string,
  pixelCrop: CropArea,
  filename = "cropped.jpg",
  maxDim = 1200
): Promise<File | null> {
  const cropped = await getCroppedImg(imageSrc, pixelCrop);
  if (!cropped) return null;
  const compressed = await compressImage(cropped, maxDim);
  return new File([compressed], filename, { type: "image/jpeg" });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
