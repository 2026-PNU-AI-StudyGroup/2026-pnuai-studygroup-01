export type CreateTopicApplicationInput = {
  topicId: string;
  studentId: string;
  message: string;
  skills: string[];
  desiredRole: string;
  availability: string;
  appliedAt: Date;
};

export type CreateTopicApplicationResult =
  | { outcome: "CREATED"; id: string }
  | { outcome: "ALREADY_APPLIED" }
  | { outcome: "STUDENT_ALREADY_ASSIGNED" }
  | { outcome: "TOPIC_UNAVAILABLE" };

export interface TopicApplicationCreator {
  createIfAvailable(
    input: CreateTopicApplicationInput,
  ): Promise<CreateTopicApplicationResult>;
}

export type TopicApplicationSummary = {
  id: string;
  topicId: string;
  topicTitle: string;
  topicStatus: "DRAFT" | "PUBLISHED" | "CLOSED";
  programName: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  message: string;
  skills: string[];
  desiredRole: string;
  availability: string;
  createdAt: Date;
  decidedAt: Date | null;
};

export interface TopicApplicationLister {
  listByStudent(studentId: string): Promise<TopicApplicationSummary[]>;
}

export type ProfessorTopicApplicationSummary = Omit<TopicApplicationSummary, "topicStatus" | "programName" | "decidedAt"> & {
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
