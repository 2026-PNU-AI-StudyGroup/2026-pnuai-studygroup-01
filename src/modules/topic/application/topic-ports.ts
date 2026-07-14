import type {
  TopicDetails,
  TopicSchedule,
} from "@/modules/topic/domain/topic-policy";

export type TopicDraft = TopicDetails &
  TopicSchedule & {
    academicCycleId: string;
    programId: string;
    authorId: string;
  };

export interface TopicCreator {
  createDraft(topic: TopicDraft): Promise<{ id: string } | null>;
}

export type TopicSummary = TopicDraft & {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  publishedAt: Date | null;
  programName: string;
  programCategory: string;
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
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

export type PublicTopicSummary = TopicSummary & {
  authorName: string;
  academicYear: number;
  term: "FIRST" | "SECOND";
  memberCount: number;
};

export interface PublicTopicLister {
  listPublished(programId?: string): Promise<PublicTopicSummary[]>;
}
