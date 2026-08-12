import {
  ProjectProgramNotOpenError,
  TopicCreationForbiddenError,
} from "@/modules/topic/application/create-topic";
import {
  InvalidTopicDetailsError,
} from "@/modules/topic/domain/topic-policy";

export function getCreateTopicErrorMessage(error: unknown): string | null {
  if (
    error instanceof TopicCreationForbiddenError ||
    error instanceof ProjectProgramNotOpenError ||
    error instanceof InvalidTopicDetailsError
  ) {
    return error.message;
  }

  return null;
}
