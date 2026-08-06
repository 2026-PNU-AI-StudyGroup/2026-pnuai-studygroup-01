import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type AuditAction =
  | "PROFESSOR_ACCESS_GRANTED"
  | "PROFESSOR_ACCESS_REVOKED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "TEAM_CONFIRMED"
  | "TEAM_CLOSED"
  | "REPORT_REQUIREMENT_SET"
  | "REPORT_REQUIREMENT_REMOVED"
  | "REPORT_APPROVED"
  | "REPORT_REVISION_REQUESTED"
  | "PROJECT_ASSISTANT_INVITED"
  | "PROJECT_ASSISTANT_ACCEPTED"
  | "PROJECT_ASSISTANT_REMOVED"
  | "TOPIC_CLOSED";

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
