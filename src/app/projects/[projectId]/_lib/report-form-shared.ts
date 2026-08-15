"use client";

import type { ReportActionState } from "@/app/projects/[projectId]/_actions/team-report-actions";
import type { FilePurpose } from "@/modules/file/domain/upload-policy";
import {
  hashFile,
  isUploadAbortError,
  teamFileUploadProgressLabel,
  uploadFailureMessage,
  uploadStoredFile,
  type FileUploadProgress,
  type FileUploadStage,
} from "@/modules/file/ui/upload-file";

export { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";
export { isUploadAbortError, uploadFailureMessage, uploadStoredFile };
export const hashTeamFile = hashFile;
export type TeamFileUploadProgress = FileUploadProgress;
export type TeamFileUploadStage = FileUploadStage;
export { teamFileUploadProgressLabel };

export const initialReportActionState: ReportActionState = { status: "idle", message: "" };
export const koreanDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

export async function uploadTeamFile(
  teamId: string,
  purpose: FilePurpose,
  file: File,
  options: { signal?: AbortSignal; onProgress?: (progress: FileUploadProgress) => void } = {},
): Promise<string> {
  return uploadStoredFile({ teamId, purpose }, file, options);
}
