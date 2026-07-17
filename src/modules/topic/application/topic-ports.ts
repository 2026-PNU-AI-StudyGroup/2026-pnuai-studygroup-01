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

export type TopicApplicationQuestionSummary = {
  id: string;
  label: string;
  maxLength: number;
  required: boolean;
};

export type TopicSummary = Omit<TopicDraft, "applicationQuestions"> & {
  id: string;
  applicationQuestions: TopicApplicationQuestionSummary[];
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

export interface ManagedTopicReader {
  findManaged(id: string, actor: CurrentActor): Promise<TopicSummary | null>;
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
  ownApplicationStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
};

export type PublicTopicPhase = "ACTIVE" | "RECRUITING" | "CLOSING_SOON";
export type PublicTopicSort = "LATEST" | "DEADLINE";

export type PublicTopicQuery = {
  viewerId?: string;
  programId?: string;
  query: string;
  phase: PublicTopicPhase;
  sort: PublicTopicSort;
  page: number;
  pageSize: number;
  now: Date;
};

export type PublicTopicPage = {
  items: PublicTopicSummary[];
  page: number;
  totalPages: number;
  total: number;
  counts: Record<PublicTopicPhase, number>;
};

export interface PublicTopicLister {
  listPublished(query: PublicTopicQuery): Promise<PublicTopicPage>;
  findPublished(id: string): Promise<PublicTopicSummary | null>;
}
