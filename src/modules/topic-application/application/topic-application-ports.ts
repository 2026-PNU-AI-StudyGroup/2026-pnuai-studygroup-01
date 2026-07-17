export type CreateTopicApplicationInput = {
  topicId: string;
  studentId: string;
  studentEmail: string;
  kind: "INDIVIDUAL" | "TEAM";
  answers: Array<{ questionId: string; value: string }>;
  inviteeEmails: string[];
  appliedAt: Date;
};

export type CreateTopicApplicationResult =
  | { outcome: "CREATED"; id: string }
  | { outcome: "INVITATIONS_PENDING"; draftId: string }
  | { outcome: "ALREADY_APPLIED" }
  | { outcome: "STUDENT_ALREADY_ASSIGNED" }
  | { outcome: "TEAM_MEMBER_UNAVAILABLE" }
  | { outcome: "TOPIC_UNAVAILABLE" };

export type TopicApplicationConfiguration = {
  topicId: string;
  mode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM";
  capacity: number;
  questions: Array<{ id: string; label: string; maxLength: number; required: boolean }>;
};

export interface TopicApplicationCreator {
  findConfiguration(topicId: string, appliedAt: Date): Promise<TopicApplicationConfiguration | null>;
  createIndividualIfAvailable(
    input: CreateTopicApplicationInput & { kind: "INDIVIDUAL"; inviteeEmails: [] },
  ): Promise<CreateTopicApplicationResult>;
  createTeamDraftIfAvailable(
    input: CreateTopicApplicationInput & { kind: "TEAM" },
  ): Promise<CreateTopicApplicationResult>;
}

export type TopicApplicationAnswerSummary = {
  questionId: string;
  label: string;
  required: boolean;
  maxLength: number;
  value: string;
};

export type TopicApplicationTeamMemberSummary = {
  studentId: string;
  name: string;
  email: string;
  role: "LEADER" | "MEMBER";
};

export type TeamApplicationInvitationSummary = {
  id: string;
  draftId: string;
  topicId: string;
  topicTitle: string;
  leaderName: string;
  leaderEmail: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: Date;
};

export type TeamApplicationDraftSummary = {
  id: string;
  topicId: string;
  topicTitle: string;
  createdAt: Date;
  invitations: Array<{ email: string; status: "PENDING" | "ACCEPTED" | "DECLINED" }>;
};

export interface TeamApplicationInvitationRepository {
  listForInvitee(email: string): Promise<TeamApplicationInvitationSummary[]>;
  listByLeader(leaderId: string): Promise<TeamApplicationDraftSummary[]>;
  respond(
    invitationId: string,
    actor: { id: string; email: string },
    decision: "ACCEPT" | "DECLINE",
    respondedAt: Date,
  ): Promise<"PENDING" | "APPLICATION_CREATED" | "DECLINED" | "NOT_FOUND" | "CONFLICT" | "TOPIC_UNAVAILABLE" | "MEMBER_UNAVAILABLE">;
  cancelDraft(draftId: string, leaderId: string): Promise<boolean>;
}

export type TopicApplicationSummary = {
  id: string;
  topicId: string;
  topicTitle: string;
  topicStatus: "DRAFT" | "PUBLISHED" | "CLOSED";
  programName: string;
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
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

export interface TopicApplicationLister {
  listByStudent(studentId: string, page: number, pageSize: number): Promise<TopicApplicationPage>;
  findByStudentAndTopic(studentId: string, topicId: string): Promise<TopicApplicationSummary | null>;
}

export type ProfessorTopicApplicationSummary = Omit<TopicApplicationSummary, "topicStatus" | "programName" | "programStatus" | "decidedAt"> & {
  topicAuthorId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
};

export interface ProfessorTopicApplicationLister {
  listByTopicAuthor(
    authorId: string,
  ): Promise<ProfessorTopicApplicationSummary[]>;
  listAll(): Promise<ProfessorTopicApplicationSummary[]>;
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
  topicAuthorId: string;
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
  ): Promise<AcceptTopicApplicationOutcome>;
  reject(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<RejectTopicApplicationOutcome>;
}
