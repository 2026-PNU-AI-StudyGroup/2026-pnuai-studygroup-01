import { describe, expect, it, vi } from "vitest";

import { UpdateTopicService } from "@/modules/topic/application/update-topic";
import type { TopicEditor } from "@/modules/topic/application/topic-ports";

const input = {
  programId: "program-1",
  divisionId: "division-forged",
  title: "  접근성 지도  ",
  description: "  교내 이동 경로를 개선합니다.  ",
  requiredSkills: [" TypeScript ", "TypeScript"],
  preferredSkills: [" Figma "],
  roleExpectations: "  구현과 검증  ",
  availabilityRequirement: "  주 1회 회의  ",
  applicationMode: "INDIVIDUAL_ONLY" as const,
  applicationQuestions: [{ label: "  지원 동기  ", maxLength: 500, required: true }],
  capacity: 4,
};

function repository(outcome: Awaited<ReturnType<TopicEditor["update"]>> = "UPDATED"): TopicEditor {
  return {
    update: vi.fn(async () => outcome),
  };
}

describe("주제 내용 수정", () => {
  it("내용과 기술 목록을 정규화한 뒤 현재 감독자 문맥으로 저장한다", async () => {
    const target = repository();
    const actor = { id: "professor-1", role: "PROFESSOR" as const };

    await new UpdateTopicService(target).execute(actor, "topic-1", input);

    expect(target.update).toHaveBeenCalledWith("topic-1", actor, expect.objectContaining({
      title: "접근성 지도",
      description: "교내 이동 경로를 개선합니다.",
      requiredSkills: ["TypeScript"],
      preferredSkills: ["Figma"],
      roleExpectations: "구현과 검증",
      availabilityRequirement: "주 1회 회의",
      applicationQuestions: [{ label: "지원 동기", maxLength: 500, required: true }],
    }));
    expect(target.update).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ divisionId: expect.anything() }));
  });

  it("지원서가 제출된 뒤 지원 양식 변경을 명시적으로 거부한다", async () => {
    await expect(new UpdateTopicService(repository("APPLICATION_FORM_LOCKED")).execute(
      { id: "professor-1", role: "PROFESSOR" },
      "topic-1",
      input,
    )).rejects.toThrow("제출된 지원서가 있어 지원 방식과 문항은 변경할 수 없습니다.");
  });

});
