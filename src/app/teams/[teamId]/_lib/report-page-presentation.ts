import type { ReportWorkspace } from "@/modules/report/application/report-ports";

export type ReportItem = ReportWorkspace["reports"][number];

export type ReportPresentationState =
  | "UNSUBMITTED"
  | "PENDING_REVIEW"
  | "REVISION_REQUESTED"
  | "APPROVED";

export type StudentReportFocusKind =
  | "REVISION"
  | "SUBMIT"
  | "REVISION_BLOCKED"
  | "SUBMIT_BLOCKED"
  | "WAITING"
  | "COMPLETE";

export type StudentReportFocus = {
  kind: StudentReportFocusKind;
  report: ReportItem;
};

const reportTypeOrder = {
  START: 0,
  MIDTERM: 1,
  FINAL: 2,
} as const;

export function reportPresentationState(report: ReportItem): ReportPresentationState {
  const latestVersion = report.versions[0];
  if (!latestVersion) return "UNSUBMITTED";
  if (!latestVersion.decision) return "PENDING_REVIEW";
  return latestVersion.decision.decision;
}

export function isReportSubmissionOpen(report: ReportItem, now: Date): boolean {
  return report.dueAt.getTime() >= now.getTime();
}

function focusPriority(report: ReportItem, now: Date): number {
  const state = reportPresentationState(report);
  const submissionOpen = isReportSubmissionOpen(report, now);

  if (state === "REVISION_REQUESTED" && submissionOpen) return 0;
  if (state === "UNSUBMITTED" && submissionOpen) return 1;
  if (state === "REVISION_REQUESTED") return 2;
  if (state === "UNSUBMITTED") return 3;
  if (state === "PENDING_REVIEW") return 4;
  return 5;
}

function focusKind(report: ReportItem, now: Date): StudentReportFocusKind {
  const state = reportPresentationState(report);
  const submissionOpen = isReportSubmissionOpen(report, now);

  if (state === "REVISION_REQUESTED") return submissionOpen ? "REVISION" : "REVISION_BLOCKED";
  if (state === "UNSUBMITTED") return submissionOpen ? "SUBMIT" : "SUBMIT_BLOCKED";
  if (state === "PENDING_REVIEW") return "WAITING";
  return "COMPLETE";
}

export function selectStudentReportFocus(reports: ReportItem[], now: Date): StudentReportFocus | null {
  const report = [...reports].sort((left, right) => {
    const priorityDifference = focusPriority(left, now) - focusPriority(right, now);
    if (priorityDifference !== 0) return priorityDifference;

    const dueAtDifference = left.dueAt.getTime() - right.dueAt.getTime();
    if (dueAtDifference !== 0) return dueAtDifference;

    const typeDifference = reportTypeOrder[left.type] - reportTypeOrder[right.type];
    if (typeDifference !== 0) return typeDifference;
    return left.id.localeCompare(right.id);
  })[0];

  return report ? { kind: focusKind(report, now), report } : null;
}
