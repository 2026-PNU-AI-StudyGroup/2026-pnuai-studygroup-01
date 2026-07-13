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

export type TopicStateRecord = {
  id: string;
  authorId: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  recruitmentEndsAt: Date;
};

export interface TopicStateRepository {
  findState(id: string): Promise<TopicStateRecord | null>;
  publishDraft(id: string, publishedAt: Date): Promise<boolean>;
  closePublished(id: string): Promise<boolean>;
}
