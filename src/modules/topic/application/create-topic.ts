import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { programLifecycleStatus, type ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import type {
  TopicCreator,
  TopicDraft,
} from "@/modules/topic/application/topic-ports";
import {
  assertValidTopicDetails,
  canCreateTopic,
} from "@/modules/topic/domain/topic-policy";
import { isProjectRegistrationOpen } from "@/modules/project-program/domain/project-program-policy";

export class TopicCreationForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 프로젝트를 생성할 수 있습니다.");
    this.name = "TopicCreationForbiddenError";
  }
}

export class ProjectProgramNotOpenError extends Error {
  constructor() {
    super("현재 프로젝트를 등록할 수 있는 공개 프로그램이 아닙니다.");
    this.name = "ProjectProgramNotOpenError";
  }
}

export class CreateTopicService {
  constructor(
    private readonly topicRepository: TopicCreator,
    private readonly programRepository: Pick<ProjectProgramRepository, "findById">,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    actor: CurrentActor,
    input: Omit<TopicDraft, "authorId">,
  ): Promise<{ id: string }> {
    if (!canCreateTopic(actor)) {
      throw new TopicCreationForbiddenError();
    }

    const details = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      requiredSkills: [...new Set(input.requiredSkills.map((skill) => skill.trim()).filter(Boolean))],
      preferredSkills: [...new Set(input.preferredSkills.map((skill) => skill.trim()).filter(Boolean))],
      roleExpectations: input.roleExpectations.trim(),
      availabilityRequirement: input.availabilityRequirement.trim(),
      applicationQuestions: input.applicationQuestions.map((question) => ({
        ...question,
        label: question.label.trim(),
      })),
    };
    assertValidTopicDetails(details);

    const program = await this.programRepository.findById(input.programId);
    if (!program || programLifecycleStatus(program) !== "ACTIVE") {
      throw new ProjectProgramNotOpenError();
    }
    const registeredAt = this.now();
    if (!isProjectRegistrationOpen(program, registeredAt)) {
      throw new ProjectProgramNotOpenError();
    }
    const created = await this.topicRepository.createPublished({
      ...details,
      authorId: actor.id,
    }, registeredAt);
    if (!created) {
      throw new ProjectProgramNotOpenError();
    }
    return created;
  }
}
