export type TopicApplicationConfiguration = {
  topicId: string;
  mode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM";
  capacity: number;
  questions: Array<{
    id: string;
    label: string;
    maxLength: number;
    required: boolean;
  }>;
};
