import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicDraft, TopicEditor } from "@/modules/topic/application/topic-ports";
import {
  assertValidTopicDetails,
} from "@/modules/topic/domain/topic-policy";

export class TopicUpdateError extends Error {}

function normalizeTopic(input: Omit<TopicDraft, "authorId">): Omit<TopicDraft, "authorId" | "divisionId"> {
  const { divisionId: _divisionId, ...editable } = input;
  void _divisionId;
  return {
    ...editable,
    title: input.title.trim(),
    description: input.description.trim(),
    requiredSkills: [...new Set(input.requiredSkills.map((skill) => skill.trim()).filter(Boolean))],
    preferredSkills: [...new Set(input.preferredSkills.map((skill) => skill.trim()).filter(Boolean))],
    roleExpectations: input.roleExpectations.trim(),
    availabilityRequirement: input.availabilityRequirement.trim(),
    recruitmentEnabled: input.recruitmentEnabled ?? true,
    applicationQuestions: input.applicationQuestions.map((question) => ({
      ...question,
      label: question.label.trim(),
    })),
  };
}

export class UpdateTopicService {
  constructor(private readonly repository: TopicEditor) {}

  async execute(actor: CurrentActor, topicId: string, input: Omit<TopicDraft, "authorId">): Promise<void> {
    const normalized = normalizeTopic(input);
    assertValidTopicDetails(normalized);
    const outcome = await this.repository.update(topicId, actor, normalized);
    if (outcome === "UPDATED") return;
    if (outcome === "NOT_FOUND") throw new TopicUpdateError("수정할 수 있는 프로젝트를 찾지 못했습니다.");
    if (outcome === "CLOSED") throw new TopicUpdateError("마감된 프로젝트는 수정할 수 없습니다.");
    if (outcome === "PROGRAM_UNAVAILABLE") throw new TopicUpdateError("프로젝트의 프로그램, 운영 기간 또는 모집 마감을 벗어나 변경할 수 없습니다.");
    if (outcome === "APPLICATION_FORM_LOCKED") throw new TopicUpdateError("제출된 지원서가 있어 지원 방식과 문항은 변경할 수 없습니다.");
    throw new TopicUpdateError("현재 팀 인원보다 모집 정원을 작게 설정할 수 없습니다.");
  }
}
