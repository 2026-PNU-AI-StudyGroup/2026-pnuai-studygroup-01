import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type AdminProjectCardContact = {
  id: string;
  name: string;
  role: "LEADER" | "MEMBER";
  email: string;
  contactEmail: string | null;
  phone: string | null;
  kakao: string | null;
  github: string | null;
  instagram: string | null;
};

export type AdminProjectCardData = {
  topicId: string;
  team: {
    id: string;
    name: string;
    members: AdminProjectCardContact[];
  };
  reportProgress: {
    requiredCount: number;
    submittedCount: number;
    overdueCount: number;
  };
};

export interface AdminProjectCardDataReader {
  listByTopicIds(topicIds: string[]): Promise<AdminProjectCardData[]>;
}

export class AdminProjectCardDataForbiddenError extends Error {}

export class ListAdminProjectCardDataService {
  constructor(private readonly reader: AdminProjectCardDataReader) {}

  async execute(actor: CurrentActor, topicIds: string[]) {
    if (actor.role !== "ADMIN") {
      throw new AdminProjectCardDataForbiddenError(
        "관리자만 프로젝트 진행 현황과 팀원 연락처를 확인할 수 있습니다.",
      );
    }
    return this.reader.listByTopicIds([...new Set(topicIds)]);
  }
}
