import type {
  PublicTopicPage,
  PublicTopicLister,
  PublicTopicQuery,
  PublicTopicSummary,
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
  } = {}): Promise<PublicTopicPage> {
    const page = Number.isSafeInteger(input.page) && (input.page ?? 0) > 0 ? input.page! : 1;
    const query: PublicTopicQuery = {
      viewerId: input.viewerId,
      programId: input.programId,
      divisionId: input.divisionId,
      query: input.query?.trim().slice(0, 100) ?? "",
      page,
      pageSize: 10,
      now: input.now ?? new Date(),
    };
    return this.repository.listPublished(query);
  }

  find(id: string): Promise<PublicTopicSummary | null> {
    return this.repository.findPublished(id);
  }
}
