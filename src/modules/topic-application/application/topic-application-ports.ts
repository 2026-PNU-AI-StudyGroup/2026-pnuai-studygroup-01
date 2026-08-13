import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicApplicationConfiguration } from "@/modules/topic-application/domain/topic-application-configuration";

export type { TopicApplicationConfiguration } from "@/modules/topic-application/domain/topic-application-configuration";

export type CreateTopicApplicationInput = {
  topicId: string;
  studentId: string;
  studentEmail: string;
  kind: "INDIVIDUAL" | "TEAM";
  answers: Array<{ questionId: string; value: string }>;
  studentTeamId?: string;
  appliedAt: Date;
};

export type CreateTopicApplicationResult =
  | { outcome: "CREATED"; id: string }
  | { outcome: "ALREADY_APPLIED" }
  | { outcome: "STUDENT_ALREADY_IN_PROJECT" }
  | { outcome: "TEAM_MEMBER_UNAVAILABLE" }
  | { outcome: "TOPIC_UNAVAILABLE" };

export interface TopicApplicationCreator {
  findConfiguration(topicId: string, appliedAt: Date): Promise<TopicApplicationConfiguration | null>;
  createIndividualIfAvailable(
    input: CreateTopicApplicationInput & { kind: "INDIVIDUAL" },
  ): Promise<CreateTopicApplicationResult>;
  createTeamFromStudentTeam(
    input: CreateTopicApplicationInput & { kind: "TEAM"; studentTeamId: string },
  ): Promise<CreateTopicApplicationResult>;
}

type TopicApplicationAnswerSummary = {
  questionId: string;
  label: string;
  required: boolean;
  maxLength: number;
  value: string;
};

type TopicApplicationTeamMemberSummary = {
  studentId: string;
  name: string;
  email: string;
  role: "LEADER" | "MEMBER";
};

export type TopicApplicationSummary = {
  id: string;
  topicId: string;
  topicTitle: string;
  topicStatus: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE" | "COMPLETED" | "CANCELED";
  programName: string;
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  reviewComment: string;
  message: string;
  skills: string[];
  desiredRole: string;
  availability: string;
  applicationKind: "INDIVIDUAL" | "TEAM";
  teamMembers: TopicApplicationTeamMemberSummary[];
  answers: TopicApplicationAnswerSummary[];
  createdAt: Date;
  decidedAt: Date | null;
};

export type TopicApplicationPage = {
  items: TopicApplicationSummary[];
  page: number;
  totalPages: number;
  total: number;
  counts: Record<"PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN", number>;
};

export type OwnTopicApplicationStatus = Extract<
  TopicApplicationSummary["status"],
  "PENDING" | "REJECTED"
>;

export interface TopicApplicationLister {
  listByStudent(
    studentId: string,
    page: number,
    pageSize: number,
    status?: OwnTopicApplicationStatus,
  ): Promise<TopicApplicationPage>;
  findByStudentAndTopic(studentId: string, topicId: string): Promise<TopicApplicationSummary | null>;
}

export type ProfessorTopicApplicationSummary = Omit<TopicApplicationSummary, "topicStatus" | "programName" | "programStatus"> & {
  topicManagerId: string | null;
  topicAssistantIds: string[];
  studentId: string;
  studentName: string;
  studentEmail: string;
  decidedByName: string | null;
  decisionImpact: {
    acceptedMemberCount: number;
    currentMemberCount: number;
    capacity: number;
    automaticallyRejectedApplicationCount: number;
    closesRecruitment: boolean;
  } | null;
};

export type ProfessorTopicApplicationStatus = ProfessorTopicApplicationSummary["status"];

export type ProfessorTopicApplicationListItem = {
  id: string;
  topicId: string;
  topicTitle: string;
  status: ProfessorTopicApplicationStatus;
  studentName: string;
  applicationKind: "INDIVIDUAL" | "TEAM";
  teamMemberCount: number;
  createdAt: Date;
};

export type ProfessorTopicApplicationPage = {
  items: ProfessorTopicApplicationListItem[];
  page: number;
  totalPages: number;
  total: number;
  counts: Record<ProfessorTopicApplicationStatus, number>;
};

export type ProfessorTopicApplicationQuery = {
  page: number;
  pageSize: number;
  status?: ProfessorTopicApplicationStatus;
  query: string;
};

export interface ProfessorTopicApplicationLister {
  listByTopicManager(
    managerId: string,
  ): Promise<ProfessorTopicApplicationSummary[]>;
  listAll(): Promise<ProfessorTopicApplicationSummary[]>;
  listForActor(
    actor: CurrentActor,
    query: ProfessorTopicApplicationQuery,
  ): Promise<ProfessorTopicApplicationPage>;
}

export interface ProfessorTopicApplicationReader {
  findVisibleById(
    id: string,
    actor: CurrentActor,
  ): Promise<ProfessorTopicApplicationSummary | null>;
}

export type TopicApplicationDecisionState = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  topicManagerId: string | null;
  topicAssistantIds: string[];
};

export type AcceptTopicApplicationOutcome =
  | "ACCEPTED"
  | "CAPACITY_REACHED"
  | "STUDENT_ALREADY_IN_PROJECT"
  | "FORBIDDEN"
  | "CONFLICT";

export type TopicApplicationDecisionActor = {
  id: string;
  isAdmin: boolean;
};

export type RejectTopicApplicationOutcome =
  | "REJECTED"
  | "FORBIDDEN"
  | "CONFLICT";

export interface TopicApplicationDecisionRepository {
  findDecisionState(id: string): Promise<TopicApplicationDecisionState | null>;
  accept(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment?: string,
  ): Promise<AcceptTopicApplicationOutcome>;
  reject(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment?: string,
  ): Promise<RejectTopicApplicationOutcome>;
}
