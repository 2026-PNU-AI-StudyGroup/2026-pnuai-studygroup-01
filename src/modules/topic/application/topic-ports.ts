import type {
  TopicDetails,
  TopicSchedule,
} from "@/modules/topic/domain/topic-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type TopicDraft = TopicDetails &
  TopicSchedule & {
    academicCycleId: string;
    programId: string;
    authorId: string;
  };

export interface TopicCreator {
  createDraft(topic: TopicDraft): Promise<{ id: string } | null>;
}

export interface TopicScheduleUpdater {
  updateSchedule(id: string, actor: CurrentActor, schedule: TopicSchedule): Promise<boolean>;
}

export type TopicSummary = TopicDraft & {
  id: string;
  authorName: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  publishedAt: Date | null;
  programName: string;
  programCategory: string;
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
};

export interface TopicLister {
  listByAuthor(authorId: string): Promise<TopicSummary[]>;
  listAll(): Promise<TopicSummary[]>;
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
