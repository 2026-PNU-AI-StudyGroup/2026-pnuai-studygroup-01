export type ProjectGuidanceRequestKind = "MEETING" | "REVIEW";
export type ProjectGuidanceRequestStatus = "PENDING" | "ANSWERED" | "CANCELED";

export class InvalidProjectGuidanceRequestError extends Error {
  constructor(message = "요청 내용을 확인해 주세요.") {
    super(message);
    this.name = "InvalidProjectGuidanceRequestError";
  }
}

export function normalizeProjectGuidanceRequest(input: {
  kind: ProjectGuidanceRequestKind;
  title: string;
  content: string;
  referenceUrl?: string;
}) {
  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length < 2 || title.length > 100) {
    throw new InvalidProjectGuidanceRequestError("요청 제목은 2자 이상 100자 이하로 입력해 주세요.");
  }
  if (content.length < 5 || content.length > 2_000) {
    throw new InvalidProjectGuidanceRequestError("요청 내용은 5자 이상 2,000자 이하로 입력해 주세요.");
  }

  const referenceUrl = normalizeReferenceUrl(input.referenceUrl);
  return { title, content, referenceUrl, preferredAt: null };
}

export function normalizeProjectGuidanceResponse(input: {
  response: string;
  scheduledAt?: Date;
}, now: Date) {
  const response = input.response.trim();
  if (response.length < 2 || response.length > 2_000) {
    throw new InvalidProjectGuidanceRequestError("답변은 2자 이상 2,000자 이하로 입력해 주세요.");
  }
  const scheduledAt = input.scheduledAt ?? null;
  if (scheduledAt && (!isValidDate(scheduledAt) || scheduledAt <= now)) {
    throw new InvalidProjectGuidanceRequestError("현재 이후의 확정 일시를 입력해 주세요.");
  }
  return { response, scheduledAt };
}

function normalizeReferenceUrl(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > 2_048) {
    throw new InvalidProjectGuidanceRequestError("참고 링크는 2,048자 이하로 입력해 주세요.");
  }
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new InvalidProjectGuidanceRequestError("HTTP 또는 HTTPS 참고 링크를 입력해 주세요.");
  }
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}
