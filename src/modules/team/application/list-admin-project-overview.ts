import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";

export type AdminProjectOverviewItem = {
  id: string;
  name: string;
  topicTitle: string;
  professorName: string;
  advisorEnabled: boolean;
  status: "FORMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  memberCount: number;
  reportCount: number;
  submittedReportCount: number;
  overdueReportCount: number;
};

export type AdminProjectOverviewProgram = {
  id: string;
  name: string;
  category: string;
  icon: ProgramIconKey;
  startYear: number;
  status: "DRAFT" | "OPEN" | "CLOSED";
  isStudentPublic: boolean;
  isFacultyPublic: boolean;
  votingEndsAt?: Date;
  advisorEnabled: boolean;
  projects: AdminProjectOverviewItem[];
};

export interface AdminProjectOverviewReader {
  listByProgram(): Promise<AdminProjectOverviewProgram[]>;
}

export class AdminProjectOverviewForbiddenError extends Error {}

export class ListAdminProjectOverviewService {
  constructor(private readonly reader: AdminProjectOverviewReader) {}

  async execute(actor: CurrentActor): Promise<AdminProjectOverviewProgram[]> {
    if (actor.role !== "ADMIN") {
      throw new AdminProjectOverviewForbiddenError(
        "관리자만 전체 프로젝트 현황을 확인할 수 있습니다.",
      );
    }
    return this.reader.listByProgram();
  }
}
