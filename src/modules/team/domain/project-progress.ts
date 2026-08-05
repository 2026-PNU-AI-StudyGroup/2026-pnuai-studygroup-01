export type ProjectProgressStage = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type ProjectProgressBand =
  | "NOT_STARTED"
  | "EARLY"
  | "MIDDLE"
  | "LATE"
  | "FINALIZING"
  | "COMPLETED";

export function calculateProjectProgress(
  completedMilestoneCount: number,
  milestoneCount: number,
): number {
  if (milestoneCount <= 0) return 0;

  const completed = Math.min(Math.max(completedMilestoneCount, 0), milestoneCount);
  return Math.round((completed / milestoneCount) * 100);
}

export function calculateReportSubmissionRate(
  submittedReportCount: number,
  reportCount: number,
): number {
  if (reportCount <= 0) return 0;
  const submitted = Math.min(Math.max(submittedReportCount, 0), reportCount);
  return Math.round((submitted / reportCount) * 100);
}

export function hasMilestonePlan(milestoneCount: number): boolean {
  return milestoneCount > 0;
}

export function hasReportSchedule(reportCount: number): boolean {
  return reportCount > 0;
}

export function classifyProjectProgress(progress: number): ProjectProgressStage {
  if (progress <= 0) return "NOT_STARTED";
  if (progress >= 100) return "COMPLETED";
  return "IN_PROGRESS";
}

export function classifyProjectProgressBand(progress: number): ProjectProgressBand {
  if (progress <= 0) return "NOT_STARTED";
  if (progress <= 25) return "EARLY";
  if (progress <= 50) return "MIDDLE";
  if (progress <= 75) return "LATE";
  if (progress < 100) return "FINALIZING";
  return "COMPLETED";
}

export function isReportSubmissionOverdue(
  dueAt: Date,
  hasSubmission: boolean,
  now: Date,
): boolean {
  return !hasSubmission && dueAt.getTime() < now.getTime();
}
