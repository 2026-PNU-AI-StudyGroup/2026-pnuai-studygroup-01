// 프로젝트 쇼케이스 공용 상수·검증. 클라이언트 폼과 서버 액션이 공유한다.

export const SHOWCASE_LIMITS = {
  summary: 2_000,
  url: 500,
  maxImages: 12,
} as const;

export const SHOWCASE_IMAGE_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

// http/https URL만 허용. 빈 값은 통과(선택 필드).
export function normalizeShowcaseUrl(raw: FormDataEntryValue | null): string | null | undefined {
  if (raw === null) return null;
  const value = String(raw).trim();
  if (value === "") return null;
  if (value.length > SHOWCASE_LIMITS.url) return undefined;
  return /^https?:\/\/\S+$/.test(value) ? value : undefined;
}

// YouTube watch/short URL을 embed URL로 변환. 실패 시 null.
export function toYoutubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export type ShowcaseActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const showcaseInitialState: ShowcaseActionState = { status: "idle", message: "" };
