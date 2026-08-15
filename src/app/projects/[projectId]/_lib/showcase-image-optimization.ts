export const SHOWCASE_IMAGE_MAX_EDGE = 1_600;
const SHOWCASE_IMAGE_WEBP_QUALITY = 0.84;

export function scaleShowcaseImage(width: number, height: number): { width: number; height: number } {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= SHOWCASE_IMAGE_MAX_EDGE) return { width, height };
  const scale = SHOWCASE_IMAGE_MAX_EDGE / longestEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function optimizedFileName(name: string): string {
  const baseName = name.replace(/\.[^./\\]+$/, "").trim() || "showcase-image";
  return `${baseName}.webp`;
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", SHOWCASE_IMAGE_WEBP_QUALITY));
}

// The browser keeps the original when decoding or WebP encoding is unavailable,
// or when optimization would increase the file size.
export async function optimizeShowcaseImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const { width, height } = scaleShowcaseImage(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return file;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(bitmap, 0, 0, width, height);
    const optimized = await canvasToWebp(canvas);
    if (!optimized || optimized.size >= file.size) return file;
    return new File([optimized], optimizedFileName(file.name), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
