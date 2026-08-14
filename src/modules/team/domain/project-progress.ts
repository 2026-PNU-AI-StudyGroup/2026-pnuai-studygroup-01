export type ProjectProgressStage = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export function calculateReportSubmissionRate(
  submittedReportCount: number,
  reportCount: number,
): number {
  if (reportCount <= 0) return 0;
  const submitted = Math.min(Math.max(submittedReportCount, 0), reportCount);
  return Math.round((submitted / reportCount) * 100);
}

export function hasReportSchedule(reportCount: number): boolean {
  return reportCount > 0;
}

export function classifyProjectProgress(progress: number): ProjectProgressStage {
  if (progress <= 0) return "NOT_STARTED";
  if (progress >= 100) return "COMPLETED";
  return "IN_PROGRESS";
}

export function isReportSubmissionOverdue(
  dueAt: Date,
  hasSubmission: boolean,
  now: Date,
): boolean {
  return !hasSubmission && dueAt.getTime() < now.getTime();
}
