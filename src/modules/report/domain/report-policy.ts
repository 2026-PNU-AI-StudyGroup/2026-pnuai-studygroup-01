export type ReportType = "START" | "MIDTERM" | "FINAL";
export type ApprovalDecision = "APPROVED" | "REVISION_REQUESTED";
export type ArtifactType = "PRESENTATION_VIDEO" | "SOURCE_CODE" | "POSTER" | "OTHER";

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
