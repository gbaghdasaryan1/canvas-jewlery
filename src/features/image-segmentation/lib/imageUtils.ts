/** Canvas/blob helpers for the segmentation pipeline. */

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = url;
  });
}

export function drawToCanvas(
  img: HTMLImageElement,
  maxSide: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imageData: ImageData } {
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, imageData: ctx.getImageData(0, 0, w, h) };
}

/** Offline fallback for background removal: key out the colour sampled along
 *  the image border. Crude next to the AI model, but keeps the page usable. */
export function chromaKeyFallback(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  };
  for (let x = 0; x < width; x += 4) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += 4) {
    sample(0, y);
    sample(width - 1, y);
  }
  r /= n;
  g /= n;
  b /= n;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b);
    if (dist < 55) out.data[i + 3] = 0;
  }
  return out;
}
