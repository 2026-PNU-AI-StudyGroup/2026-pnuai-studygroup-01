export type CreateTopicApplicationInput = {
  topicId: string;
  studentId: string;
  message: string;
  appliedAt: Date;
};

export type CreateTopicApplicationResult =
  | { outcome: "CREATED"; id: string }
  | { outcome: "ALREADY_APPLIED" }
  | { outcome: "TOPIC_UNAVAILABLE" };

export interface TopicApplicationCreator {
  createIfAvailable(
    input: CreateTopicApplicationInput,
  ): Promise<CreateTopicApplicationResult>;
}

export type TopicApplicationSummary = {
  id: string;
  topicId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  message: string;
  createdAt: Date;
};

export interface TopicApplicationLister {
  listByStudent(studentId: string): Promise<TopicApplicationSummary[]>;
}
