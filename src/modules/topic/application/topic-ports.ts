import type {
  TopicDetails,
  TopicSchedule,
} from "@/modules/topic/domain/topic-policy";

export type TopicDraft = TopicDetails &
  TopicSchedule & {
    academicCycleId: string;
    authorId: string;
  };

export interface TopicCreator {
  createDraft(topic: TopicDraft): Promise<{ id: string }>;
}

export type TopicSummary = TopicDraft & {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  publishedAt: Date | null;
};

export interface TopicLister {
  listByAuthor(authorId: string): Promise<TopicSummary[]>;
}
