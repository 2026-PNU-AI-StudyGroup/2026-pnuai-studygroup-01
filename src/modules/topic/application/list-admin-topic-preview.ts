import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { AdminTopicPreviewLister, AdminTopicPreviewQuery, PublicTopicPage } from "@/modules/topic/application/topic-ports";

export class ListAdminTopicPreviewService {
  constructor(private readonly repository: AdminTopicPreviewLister) {}

  execute(actor: CurrentActor, input: {
    programId?: string;
    divisionId?: string | "UNASSIGNED";
    query?: string;
    page?: number;
    now?: Date;
    topicIds?: string[];
  }): Promise<PublicTopicPage> {
    if (actor.role !== "ADMIN") throw new Error("관리자만 비공개 프로그램을 미리 볼 수 있습니다.");
    const page = Number.isSafeInteger(input.page) && (input.page ?? 0) > 0 ? input.page! : 1;
    const query: AdminTopicPreviewQuery = {
      programId: input.programId,
      divisionId: input.divisionId,
      query: input.query?.trim().slice(0, 100) ?? "",
      page,
      pageSize: 10,
      now: input.now ?? new Date(),
      topicIds: input.topicIds,
    };
    return this.repository.listPublishedForAdmin(query);
  }

  find(actor: CurrentActor, id: string) {
    if (actor.role !== "ADMIN") throw new Error("관리자만 비공개 프로그램을 미리 볼 수 있습니다.");
    return this.repository.findPublishedForAdmin(id);
  }
}
