import type {
  TopicDetails,
  TopicSchedule,
} from "@/modules/topic/domain/topic-policy";

export type TopicDraft = TopicDetails &
  TopicSchedule & {
    academicCycleId: string;
    authorId: string;
  };

export interface TopicCreator {
  createDraft(topic: TopicDraft): Promise<{ id: string }>;
}
