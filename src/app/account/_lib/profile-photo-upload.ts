import {
  isProfileImageContentType,
  PROFILE_IMAGE_MAX_BYTES,
} from "@/modules/identity/domain/profile-image-policy";

export class ProfilePhotoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfilePhotoUploadError";
  }
}

export function validateProfilePhotoFile(file: File): void {
  if (!isProfileImageContentType(file.type)) {
    throw new ProfilePhotoUploadError("JPEG, PNG, WebP 이미지만 올릴 수 있습니다.");
  }
  if (file.size <= 0 || file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new ProfilePhotoUploadError("사진은 5MiB 이하여야 합니다.");
  }
}

export async function uploadProfilePhoto(
  file: File,
  options: { signal: AbortSignal; onProgress: (percent: number) => void },
): Promise<void> {
  validateProfilePhotoFile(file);
  const sha256 = await sha256File(file);
  throwIfAborted(options.signal);
  const presigned = await requestJson<{ uploadId: string; uploadUrl: string }>("/api/profile-images/presign", {
    method: "POST",
    body: JSON.stringify({
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      sha256,
    }),
  });
  await putFile(presigned.uploadUrl, file, options);
  throwIfAborted(options.signal);
  await requestJson("/api/profile-images/complete", {
    method: "POST",
    body: JSON.stringify({ uploadId: presigned.uploadId }),
  });
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
  if (response.ok) return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  const body = await response.json().catch(() => null) as { message?: string } | null;
  throw new ProfilePhotoUploadError(body?.message ?? "사진을 처리하지 못했습니다.");
}

function putFile(
  url: string,
  file: File,
  { signal, onProgress }: { signal: AbortSignal; onProgress: (percent: number) => void },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    signal.addEventListener("abort", abort, { once: true });
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new ProfilePhotoUploadError("사진 업로드에 실패했습니다."));
    request.onabort = () => reject(new DOMException("업로드를 취소했습니다.", "AbortError"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new ProfilePhotoUploadError("사진 업로드에 실패했습니다."));
    };
    request.onloadend = () => signal.removeEventListener("abort", abort);
    request.send(file);
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("업로드를 취소했습니다.", "AbortError");
}
