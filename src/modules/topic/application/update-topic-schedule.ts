import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicScheduleUpdater } from "@/modules/topic/application/topic-ports";
import { assertValidTopicSchedule, type TopicSchedule } from "@/modules/topic/domain/topic-policy";

export class TopicScheduleUpdateForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 주제 일정을 변경할 수 있습니다.");
    this.name = "TopicScheduleUpdateForbiddenError";
  }
}

export class TopicScheduleUpdateUnavailableError extends Error {
  constructor() {
    super("마감되지 않은 본인 주제의 일정만 프로그램 운영 기간 안에서 변경할 수 있습니다.");
    this.name = "TopicScheduleUpdateUnavailableError";
  }
}

export class UpdateTopicScheduleService {
  constructor(private readonly updater: TopicScheduleUpdater) {}

  async execute(actor: CurrentActor, topicId: string, schedule: TopicSchedule): Promise<void> {
    if (actor.role === "STUDENT") throw new TopicScheduleUpdateForbiddenError();
    assertValidTopicSchedule(schedule);
    if (!(await this.updater.updateSchedule(topicId, actor, schedule))) {
      throw new TopicScheduleUpdateUnavailableError();
    }
  }
}
