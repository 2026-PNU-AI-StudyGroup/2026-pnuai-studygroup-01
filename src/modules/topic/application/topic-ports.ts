import type {
  TopicDetails,
  TopicSchedule,
} from "@/modules/topic/domain/topic-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type TopicDraft = TopicDetails &
  TopicSchedule & {
    programId: string;
    authorId: string;
  };

export interface TopicCreator {
  createDraft(topic: TopicDraft, registeredAt: Date): Promise<{ id: string } | null>;
}

export interface TopicScheduleUpdater {
  updateSchedule(id: string, actor: CurrentActor, schedule: TopicSchedule): Promise<boolean>;
}

export type TopicUpdateOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "CLOSED"
  | "PROGRAM_UNAVAILABLE"
  | "APPLICATION_FORM_LOCKED"
  | "CAPACITY_TOO_SMALL";

export interface TopicEditor {
  update(
    id: string,
    actor: CurrentActor,
    topic: Omit<TopicDraft, "authorId">,
  ): Promise<TopicUpdateOutcome>;
  deleteDraft(id: string, actor: CurrentActor): Promise<boolean>;
}

type TopicApplicationQuestionSummary = {
  id: string;
  label: string;
  maxLength: number;
  required: boolean;
};

export type TopicSummary = Omit<TopicDraft, "applicationQuestions"> & {
  id: string;
  recruitmentEnabled: boolean;
  applicationQuestions: TopicApplicationQuestionSummary[];
  authorName: string;
  authorRole: "STUDENT" | "PROFESSOR" | "ADMIN";
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  publishedAt: Date | null;
  programName: string;
  programCategory: string;
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
  advisorEnabled: boolean;
  programRecruitmentEndsAt: Date;
};

export type ManagedTopicSummary = TopicSummary & {
  managerId: string | null;
  pendingApplicationCount: number;
  openRecruitmentPostCount: number;
};

export type ManagedTopicPage = {
  items: ManagedTopicSummary[];
  page: number;
  totalPages: number;
  total: number;
};

export interface TopicLister {
  listByManager(managerId: string): Promise<ManagedTopicSummary[]>;
  listAll(): Promise<ManagedTopicSummary[]>;
  listForActor(actor: CurrentActor): Promise<ManagedTopicSummary[]>;
  listPageForActor(actor: CurrentActor, page: number, pageSize: number): Promise<ManagedTopicPage>;
}

export interface ManagedTopicReader {
  findManaged(id: string, actor: CurrentActor): Promise<ManagedTopicSummary | null>;
}

export type TopicStateRecord = {
  id: string;
  programId?: string;
  authorId: string;
  managerId: string | null;
  assistantIds: string[];
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  recruitmentEnabled: boolean;
};

export interface TopicStateRepository {
  findState(id: string): Promise<TopicStateRecord | null>;
  publishDraft(id: string, actor: CurrentActor, publishedAt: Date): Promise<boolean>;
  closePublished(id: string, actor: CurrentActor): Promise<boolean>;
  closeRecruitment(id: string, actor: CurrentActor, closedAt: Date): Promise<boolean>;
}

export type PublicTopicSummary = TopicSummary & {
  authorName: string;
  professorName: string | null;
  startYear: number;
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
