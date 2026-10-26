import {
  PROJECT_LIST_PAGE_SIZE,
  type PublicTopicPage,
  type PublicTopicLister,
  type PublicTopicQuery,
  type PublicTopicSummary,
} from "@/modules/topic/application/topic-ports";

export class ListPublishedTopicsService {
  constructor(private readonly repository: PublicTopicLister) {}

  execute(input: {
    viewerId?: string;
    programId?: string;
    divisionId?: string | "UNASSIGNED";
    query?: string;
    page?: number;
    now?: Date;
    shuffleSeed?: string;
  } = {}): Promise<PublicTopicPage> {
    const page = Number.isSafeInteger(input.page) && (input.page ?? 0) > 0 ? input.page! : 1;
    const query: PublicTopicQuery = {
      viewerId: input.viewerId,
      programId: input.programId,
      shuffleSeed: input.shuffleSeed,
      divisionId: input.divisionId,
      query: input.query?.trim().slice(0, 100) ?? "",
      page,
      pageSize: PROJECT_LIST_PAGE_SIZE,
      now: input.now ?? new Date(),
    };
    return this.repository.listPublished(query);
  }

  /** viewerId 를 넘기면 그 학생의 지원 상태를 함께 싣는다. */
  find(id: string, viewerId?: string): Promise<PublicTopicSummary | null> {
    return this.repository.findPublished(id, viewerId);
  }
}
