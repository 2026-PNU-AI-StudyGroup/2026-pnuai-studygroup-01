import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import type { TopicApplicationCreator } from "@/modules/topic-application/application/topic-application-ports";
import {
  assertApplicationKindAllowed,
  assertCanApplyToTopic,
  normalizeApplicationAnswers,
} from "@/modules/topic-application/domain/topic-application-policy";

export class TopicAlreadyAppliedError extends Error {
  constructor() {
    super("이미 지원한 주제입니다.");
    this.name = "TopicAlreadyAppliedError";
  }
}

export class TopicUnavailableForApplicationError extends Error {
  constructor() {
    super("현재 지원할 수 없는 주제입니다.");
    this.name = "TopicUnavailableForApplicationError";
  }
}

export class StudentAlreadyAssignedError extends Error {
  constructor() {
    super("이미 같은 프로그램의 팀에 소속되어 있습니다.");
    this.name = "StudentAlreadyAssignedError";
  }
}

export class TeamMemberUnavailableError extends Error {
  constructor() {
    super("팀원 중 이미 지원했거나 같은 프로그램의 다른 프로젝트 팀에 소속된 사용자가 있습니다.");
    this.name = "TeamMemberUnavailableError";
  }
}

export class TeamLeaderRequiredError extends Error {
  constructor() {
    super("프로젝트 팀 지원은 지속형 팀의 팀장만 할 수 있습니다.");
    this.name = "TeamLeaderRequiredError";
  }
}

export class ApplyToTopicService {
  constructor(
    private readonly repository: TopicApplicationCreator,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    actor: CurrentUser,
    input: { topicId: string; kind: "INDIVIDUAL" | "TEAM"; answers: Array<{ questionId: string; value: string }>; studentTeamId?: string },
  ): Promise<{ outcome: "CREATED"; id: string }> {
    assertCanApplyToTopic(actor);
    const appliedAt = this.now();
    const configuration = await this.repository.findConfiguration(input.topicId, appliedAt);
    if (!configuration) throw new TopicUnavailableForApplicationError();
    assertApplicationKindAllowed(configuration.mode, input.kind);
    const answers = normalizeApplicationAnswers(configuration.questions, input.answers);
    if (input.kind === "TEAM" && !input.studentTeamId) throw new TeamLeaderRequiredError();

    const common = {
      topicId: input.topicId,
      studentId: actor.id,
      studentEmail: actor.email,
      answers,
      appliedAt,
    };
    const result = input.kind === "TEAM"
      ? await this.repository.createTeamFromStudentTeam({ ...common, kind: "TEAM", studentTeamId: input.studentTeamId! })
      : await this.repository.createIndividualIfAvailable({ ...common, kind: "INDIVIDUAL" });

    if (result.outcome === "ALREADY_APPLIED") {
      throw new TopicAlreadyAppliedError();
    }
    if (result.outcome === "TOPIC_UNAVAILABLE") {
      throw new TopicUnavailableForApplicationError();
    }
    if (result.outcome === "STUDENT_ALREADY_ASSIGNED") {
      throw new StudentAlreadyAssignedError();
    }
    if (result.outcome === "TEAM_MEMBER_UNAVAILABLE") {
      throw new TeamMemberUnavailableError();
    }
    return result;
  }
}
