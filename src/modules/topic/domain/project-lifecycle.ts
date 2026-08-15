export type StoredProjectStatus = "PENDING_APPROVAL" | "REJECTED" | "ACTIVE";
export type EffectiveProjectStatus =
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "FORMING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";

export function isProgramEnded(endsAt: Date, now = new Date()): boolean {
  return endsAt.getTime() <= now.getTime();
}

export function effectiveProjectStatus(input: {
  status: StoredProjectStatus;
  programEndsAt: Date;
  confirmedAt: Date | null;
}, now = new Date()): EffectiveProjectStatus {
  if (isProgramEnded(input.programEndsAt, now)) {
    return input.confirmedAt ? "COMPLETED" : "CANCELED";
  }
  if (input.status !== "ACTIVE") return input.status;
  return input.confirmedAt ? "IN_PROGRESS" : "FORMING";
}
