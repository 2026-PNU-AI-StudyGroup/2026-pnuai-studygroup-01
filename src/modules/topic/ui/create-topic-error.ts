import {
  ProjectProgramNotOpenError,
  TopicCreationForbiddenError,
} from "@/modules/topic/application/create-topic";
import {
  InvalidTopicDetailsError,
  InvalidTopicScheduleError,
} from "@/modules/topic/domain/topic-policy";

export function getCreateTopicErrorMessage(error: unknown): string | null {
  if (
    error instanceof TopicCreationForbiddenError ||
    error instanceof ProjectProgramNotOpenError ||
    error instanceof InvalidTopicDetailsError ||
    error instanceof InvalidTopicScheduleError
  ) {
    return error.message;
  }

  return null;
}
