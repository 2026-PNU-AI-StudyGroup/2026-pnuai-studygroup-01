import { SHOWCASE_IMAGE_CONTENT_TYPES, SHOWCASE_LIMITS } from "@/app/showcase/_lib/showcase-options";

// 팀 파일 업로드 API(/api/uploads/*)를 재사용해 쇼케이스 이미지를 올린다.
// 크로스라우트 import 금지 규칙 때문에 teams/_lib 헬퍼를 쓰지 않고 여기서 직접 구현한다.
// 반환값은 uploadId (= StoredFile.id)로, 서버 액션에 넘겨 첨부한다.

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MiB

export class ShowcaseImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShowcaseImageUploadError";
  }
}

export function validateShowcaseImageFile(file: File): void {
  if (!(SHOWCASE_IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    throw new ShowcaseImageUploadError("PNG, JPEG, WebP, GIF 이미지만 올릴 수 있습니다.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ShowcaseImageUploadError("이미지는 10MiB 이하여야 합니다.");
  }
}

export async function uploadShowcaseImage(
  teamId: string,
  file: File,
  options: { signal: AbortSignal; onProgress: (percent: number) => void },
): Promise<string> {
  void SHOWCASE_LIMITS;
  validateShowcaseImageFile(file);
  const sha256 = await sha256File(file);
  throwIfAborted(options.signal);
  const presigned = await requestJson<{ uploadId: string; uploadUrl: string }>("/api/uploads/presign", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      purpose: "ARTIFACT",
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      sha256,
    }),
  });
  await putFile(presigned.uploadUrl, file, sha256, options);
  throwIfAborted(options.signal);
  await requestJson("/api/uploads/complete", {
    method: "POST",
    body: JSON.stringify({ uploadId: presigned.uploadId }),
  });
  return presigned.uploadId;
}

async function sha256File(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function requestJson<T = undefined>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (response.ok) return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new ShowcaseImageUploadError(body?.message ?? "이미지를 처리하지 못했습니다.");
}

function putFile(
  url: string,
  file: File,
  sha256: string,
  { signal, onProgress }: { signal: AbortSignal; onProgress: (percent: number) => void },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    signal.addEventListener("abort", abort, { once: true });
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("x-amz-checksum-sha256", hexToBase64(sha256));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new ShowcaseImageUploadError("이미지 업로드에 실패했습니다."));
    request.onabort = () => reject(new DOMException("업로드를 취소했습니다.", "AbortError"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new ShowcaseImageUploadError("이미지 업로드에 실패했습니다."));
    };
    request.onloadend = () => signal.removeEventListener("abort", abort);
    request.send(file);
  });
}

function hexToBase64(value: string): string {
  const bytes = new Uint8Array(value.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? []);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("업로드를 취소했습니다.", "AbortError");
}
