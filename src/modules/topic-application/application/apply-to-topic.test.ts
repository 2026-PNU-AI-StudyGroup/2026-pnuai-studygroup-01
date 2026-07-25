import { describe, expect, it, vi } from "vitest";

import {
  ApplyToTopicService,
  TopicAlreadyAppliedError,
} from "@/modules/topic-application/application/apply-to-topic";
import type { TopicApplicationCreator } from "@/modules/topic-application/application/topic-application-ports";
import { TopicApplicationForbiddenError } from "@/modules/topic-application/domain/topic-application-policy";

const student = {
  id: "student-1",
  role: "STUDENT" as const,
  name: "김학생",
  email: "student@pusan.ac.kr",
  image: null,
};
const configuration = {
  topicId: "topic-1",
  mode: "INDIVIDUAL_OR_TEAM" as const,
  capacity: 4,
  questions: [{ id: "question-1", label: "지원 동기", maxLength: 300, required: true }],
};

function repository(
  outcome: { outcome: "CREATED"; id: string } | { outcome: "ALREADY_APPLIED" } = { outcome: "CREATED", id: "app-1" },
): TopicApplicationCreator {
  return {
    findConfiguration: vi.fn(async () => configuration),
    createIndividualIfAvailable: vi.fn(async () => outcome),
    createTeamDraftIfAvailable: vi.fn(async () => ({ outcome: "INVITATIONS_PENDING" as const, draftId: "draft-1" })),
    createTeamFromStudentTeam: vi.fn(async () => outcome),
  };
}

describe("주제 지원", () => {
  it("교수 지정 문항의 개인 지원 답변을 정규화해 저장한다", async () => {
    const store = repository();
    const appliedAt = new Date("2026-03-05T00:00:00Z");
    const service = new ApplyToTopicService(store, () => appliedAt);

    await expect(service.execute(student, {
      topicId: "topic-1",
      kind: "INDIVIDUAL",
      answers: [{ questionId: "question-1", value: "  참여하고 싶습니다.  " }],
      inviteeEmails: [],
    })).resolves.toEqual({ outcome: "CREATED", id: "app-1" });
    expect(store.createIndividualIfAvailable).toHaveBeenCalledWith({
      topicId: "topic-1",
      studentId: "student-1",
      studentEmail: "student@pusan.ac.kr",
      kind: "INDIVIDUAL",
      answers: [{ questionId: "question-1", value: "참여하고 싶습니다." }],
      inviteeEmails: [],
      appliedAt,
    });
  });

  it("팀 지원은 팀장이 지속형 팀 구성으로 즉시 접수한다", async () => {
    const store = repository();
    await expect(new ApplyToTopicService(store).execute(student, {
      topicId: "topic-1",
      kind: "TEAM",
      answers: [{ questionId: "question-1", value: "함께 지원합니다." }],
      studentTeamId: "team-1",
    })).resolves.toEqual({ outcome: "CREATED", id: "app-1" });
    expect(store.createTeamFromStudentTeam).toHaveBeenCalledWith(expect.objectContaining({
      kind: "TEAM",
      studentTeamId: "team-1",
    }));
  });

  it("교수의 지원 요청을 저장소 호출 전에 거절한다", async () => {
    const store = repository();
    await expect(new ApplyToTopicService(store).execute(
      { ...student, id: "professor-1", role: "PROFESSOR" },
      { topicId: "topic-1", kind: "INDIVIDUAL", answers: [], inviteeEmails: [] },
    )).rejects.toBeInstanceOf(TopicApplicationForbiddenError);
    expect(store.findConfiguration).not.toHaveBeenCalled();
  });

  it("중복 지원 결과를 명시적인 오류로 변환한다", async () => {
    const store = repository({ outcome: "ALREADY_APPLIED" });
    await expect(new ApplyToTopicService(store).execute(student, {
      topicId: "topic-1",
      kind: "INDIVIDUAL",
      answers: [{ questionId: "question-1", value: "지원합니다." }],
      inviteeEmails: [],
    })).rejects.toBeInstanceOf(TopicAlreadyAppliedError);
  });
});
