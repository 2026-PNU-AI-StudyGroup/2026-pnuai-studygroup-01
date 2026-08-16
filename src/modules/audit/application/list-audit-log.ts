import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type AuditAction =
  | "PROFESSOR_ACCESS_GRANTED"
  | "PROFESSOR_ACCESS_REVOKED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "TEAM_CONFIRMED"
  | "TEAM_CLOSED"
  | "USER_WITHDRAWN"
  | "PROJECT_TEAM_CONFIRMED"
  | "PROJECT_COMPLETED"
  | "PROJECT_CANCELED"
  | "PROJECT_RESTORED"
  | "PROJECT_REVIEW_REQUESTED"
  | "PROJECT_TEAM_MEMBER_LEFT"
  | "PROJECT_TEAM_MEMBER_REMOVED"
  | "PROJECT_TEAM_LEADERSHIP_TRANSFERRED"
  | "PROJECT_TEAM_MEMBERSHIP_CORRECTED"
  | "PROGRAM_CLOSED"
  | "REPORT_REQUIREMENT_SET"
  | "REPORT_REQUIREMENT_REMOVED"
  | "REPORT_APPROVED"
  | "REPORT_REVISION_REQUESTED"
  | "PROJECT_ASSISTANT_INVITED"
  | "PROJECT_ASSISTANT_ACCEPTED"
  | "PROJECT_ASSISTANT_REMOVED"
  | "TOPIC_CLOSED"
  | "TOPIC_RECRUITMENT_CLOSED"
  | "PROGRAM_DIVISION_CREATED"
  | "PROGRAM_DIVISION_UPDATED"
  | "PROGRAM_DIVISION_DELETED"
  | "PROGRAM_VOTING_RESET"
  | "PROGRAM_REPORT_DEFINITION_CREATED"
  | "PROGRAM_REPORT_DEFINITION_UPDATED"
  | "PROGRAM_REPORT_DEFINITION_ARCHIVED"
  | "PROGRAM_REPORT_DEFINITION_DELETED"
  | "PROGRAM_RUBRIC_CREATED"
  | "PROGRAM_RUBRIC_UPDATED"
  | "PROGRAM_RUBRIC_ARCHIVED"
  | "PROGRAM_DIVISION_RUBRIC_MODE_CHANGED"
  | "ADVISOR_REGISTERED"
  | "ADVISOR_TOKEN_ISSUED"
  | "ADVISOR_TOKEN_REVOKED"
  | "ADVISOR_TEAMS_ASSIGNED";

type AuditEntry = {
  id: string;
  action: AuditAction;
  actorName: string;
  targetLabel: string;
  createdAt: Date;
};

export type AuditPage = { items: AuditEntry[]; page: number; totalPages: number; total: number };

export interface AuditLogReader {
  list(requestedPage: number, pageSize: number): Promise<AuditPage>;
}

export class AuditLogForbiddenError extends Error {}

export class ListAuditLogService {
  constructor(private readonly reader: AuditLogReader) {}

  execute(actor: CurrentActor, requestedPage = 1) {
    if (actor.role !== "ADMIN") throw new AuditLogForbiddenError("관리자만 관리 이력을 확인할 수 있습니다.");
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    return this.reader.list(page, 50);
  }
}
