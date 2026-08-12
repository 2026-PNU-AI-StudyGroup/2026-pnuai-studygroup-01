import type {
  TopicDetails,
} from "@/modules/topic/domain/topic-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type TopicDraft = TopicDetails &
  {
    programId: string;
    divisionId?: string | null;
    authorId: string;
  };

export interface TopicCreator {
  createPublished(topic: TopicDraft, registeredAt: Date): Promise<{ id: string } | null>;
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
    topic: Omit<TopicDraft, "authorId" | "divisionId">,
  ): Promise<TopicUpdateOutcome>;
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
  status: "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "CLOSED";
  publishedAt: Date | null;
  programName: string;
  programCategory: string;
  divisionName?: string | null;
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
  advisorEnabled: boolean;
  programRecruitmentStartsAt: Date;
  programRecruitmentEndsAt: Date;
  programExecutionStartsAt: Date;
  programExecutionEndsAt: Date;
  programSubmissionStartsAt: Date;
  programSubmissionEndsAt: Date;
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
  status: "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "CLOSED";
  recruitmentEnabled: boolean;
};

export interface TopicStateRepository {
  findState(id: string): Promise<TopicStateRecord | null>;
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

export type PublicTopicQuery = {
  viewerId?: string;
  programId?: string;
  divisionId?: string | "UNASSIGNED";
  query: string;
  page: number;
  pageSize: number;
  now: Date;
};

export type PublicTopicPage = {
  items: PublicTopicSummary[];
  page: number;
  totalPages: number;
  total: number;
};

export interface PublicTopicLister {
  listPublished(query: PublicTopicQuery): Promise<PublicTopicPage>;
  findPublished(id: string): Promise<PublicTopicSummary | null>;
}
