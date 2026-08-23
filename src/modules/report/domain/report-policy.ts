export type ApprovalDecision = "APPROVED" | "REVISION_REQUESTED";
export type ArtifactType = "PRESENTATION_VIDEO" | "SOURCE_CODE" | "POSTER" | "OTHER" | "IMAGE";

export class InvalidReportInputError extends Error {
  constructor() {
    super("보고서 또는 결과물 입력을 확인해 주세요.");
    this.name = "InvalidReportInputError";
  }
}

export function normalizeDescription(value: string) {
  const normalized = value.trim();
  if (normalized.length > 2_000) throw new InvalidReportInputError();
  return normalized;
}

export function normalizeDecisionComment(decision: ApprovalDecision, value: string) {
  const normalized = value.trim();
  if (
    normalized.length > 2_000 ||
    (decision === "REVISION_REQUESTED" && normalized.length === 0)
  ) {
    throw new InvalidReportInputError();
  }
  return normalized;
}

export function normalizeReportFeedback(body: string) {
  const normalized = body.trim();
  if (normalized.length < 1 || normalized.length > 2_000) {
    throw new InvalidReportInputError();
  }
  return normalized;
}

export function normalizeArtifact(input: {
  title: string;
  externalUrl?: string;
}) {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 200) throw new InvalidReportInputError();
  if (!input.externalUrl) return { title, externalUrl: undefined };
  let url: URL;
  try {
    url = new URL(input.externalUrl);
  } catch {
    throw new InvalidReportInputError();
  }
  if (url.protocol !== "https:" || url.toString().length > 2_048) {
    throw new InvalidReportInputError();
  }
  return { title, externalUrl: url.toString() };
}

export function normalizeYoutubeUrl(value: string): string {
  const normalized = value.trim();
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new InvalidReportInputError();
  }
  // 모바일 브라우저 주소창에서 복사하면 m.youtube.com 이 온다. music 과 nocookie 도 같은 영상이다.
  const hostname = url.hostname.toLowerCase()
    .replace(/^(www|m|music)\./, "")
    .replace(/^youtube-nocookie\.com$/, "youtube.com");
  const pathParts = url.pathname.split("/").filter(Boolean);
  const videoId = hostname === "youtu.be"
    ? pathParts[0]
    : hostname === "youtube.com"
      ? url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (pathParts[0] === "embed" || pathParts[0] === "shorts")
          ? pathParts[1]
          : null
      : null;
  if (url.protocol !== "https:" || !videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new InvalidReportInputError();
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}
