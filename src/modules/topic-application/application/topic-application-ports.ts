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
  | { outcome: "STUDENT_ALREADY_ASSIGNED" }
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
  topicStatus: "DRAFT" | "PUBLISHED" | "CLOSED";
  programName: string;
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
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
  counts: Record<"PENDING" | "ACCEPTED" | "REJECTED", number>;
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

export type ProfessorTopicApplicationSummary = Omit<TopicApplicationSummary, "topicStatus" | "programName" | "programStatus" | "decidedAt"> & {
  topicManagerId: string | null;
  topicAssistantIds: string[];
  studentId: string;
  studentName: string;
  studentEmail: string;
};

export interface ProfessorTopicApplicationLister {
  listByTopicManager(
    managerId: string,
  ): Promise<ProfessorTopicApplicationSummary[]>;
  listAll(): Promise<ProfessorTopicApplicationSummary[]>;
  listForActor(actorId: string, isAdmin: boolean): Promise<ProfessorTopicApplicationSummary[]>;
}

export type ProfessorTopicApplicationViewer = {
  actorId: string;
  isAdmin: boolean;
};

export interface ProfessorTopicApplicationReader {
  findVisibleById(
    id: string,
    viewer: ProfessorTopicApplicationViewer,
  ): Promise<ProfessorTopicApplicationSummary | null>;
}

export type TopicApplicationDecisionState = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  topicManagerId: string | null;
  topicAssistantIds: string[];
};

export type AcceptTopicApplicationOutcome =
  | "ACCEPTED"
  | "CAPACITY_REACHED"
  | "STUDENT_ALREADY_ASSIGNED"
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
