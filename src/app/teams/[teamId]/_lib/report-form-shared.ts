"use client";

import type { ReportActionState } from "@/app/teams/[teamId]/_actions/team-report-actions";
import type { ReportType } from "@/modules/report/domain/report-policy";

export const initialReportActionState: ReportActionState = { status: "idle", message: "" };
export const uploadFailureMessage = "파일을 업로드하지 못했습니다. 파일 형식과 용량을 확인한 뒤 다시 시도해 주세요.";
export const reportTypeLabel: Record<ReportType, string> = {
  START: "착수 보고서",
  MIDTERM: "중간 보고서",
  FINAL: "결과 보고서",
};
export const koreanDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

export function koreanDateTimeInput(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = new Map(parts.map((part) => [part.type, part.value]));
  return `${value.get("year")}-${value.get("month")}-${value.get("day")}T${value.get("hour")}:${value.get("minute")}`;
}

async function uploadErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return uploadFailureMessage;
}

export async function uploadTeamFile(teamId: string, purpose: "REPORT" | "ARTIFACT", file: File): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
  const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const checksum = btoa(String.fromCharCode(...digest));
  const presign = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      teamId,
      purpose,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      sha256,
    }),
  });
  if (!presign.ok) throw new Error(await uploadErrorMessage(presign));

  const { uploadId, uploadUrl } = await presign.json() as { uploadId: string; uploadUrl: string };
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type, "x-amz-checksum-sha256": checksum },
    body: file,
  });
  if (!uploaded.ok) throw new Error(uploadFailureMessage);

  const completed = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadId }),
  });
  if (!completed.ok) throw new Error(await uploadErrorMessage(completed));
  return uploadId;
}
