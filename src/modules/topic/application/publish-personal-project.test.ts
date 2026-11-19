import { describe, expect, it, vi } from "vitest";

import { PersonalProjectError, publishPersonalProject, type PersonalProjectPublisher } from "@/modules/topic/application/publish-personal-project";

const student = { id: "student-1", role: "STUDENT" as const };
const programId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-11-20T00:00:00Z");

function publisher(outcome: Awaited<ReturnType<PersonalProjectPublisher["publish"]>>) {
  return { publish: vi.fn(async () => outcome) } satisfies PersonalProjectPublisher;
}

describe("publishPersonalProject", () => {
  it("다듬은 값과 정리한 GitHub 주소로 저장한다", async () => {
    const fake = publisher({ status: "PUBLISHED", projectId: "p", teamId: "t" });
    await expect(publishPersonalProject(student, { programId, title: "  일정 비서 ", description: " 메일로 일정을 잡는다 ", repoUrl: "https://github.com/Alice/Agent/tree/main" }, fake, now))
      .resolves.toEqual({ status: "PUBLISHED", projectId: "p", teamId: "t", repoUrl: "https://github.com/alice/agent" });
    expect(fake.publish).toHaveBeenCalledWith({ programId, studentId: "student-1", title: "일정 비서", description: "메일로 일정을 잡는다", divisionId: null, repoUrl: "https://github.com/alice/agent", now });
  });

  it("GitHub 칸이 비어 있으면 링크 없이 저장한다", async () => {
    const fake = publisher({ status: "PUBLISHED", projectId: "p", teamId: "t" });
    await publishPersonalProject(student, { programId, title: "a", description: "b", repoUrl: "  " }, fake, now);
    expect(fake.publish).toHaveBeenCalledWith(expect.objectContaining({ repoUrl: null }));
  });

  it("학생이 아니거나 값이 잘못되면 저장하지 않는다", async () => {
    const fake = publisher({ status: "PUBLISHED", projectId: "p", teamId: "t" });
    await expect(publishPersonalProject({ id: "x", role: "PROFESSOR" }, { programId, title: "a", description: "b" }, fake, now)).rejects.toBeInstanceOf(PersonalProjectError);
    await expect(publishPersonalProject(student, { programId, title: " ", description: "b" }, fake, now)).rejects.toThrow("프로젝트명");
    await expect(publishPersonalProject(student, { programId, title: "a", description: " " }, fake, now)).rejects.toThrow("설명");
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b", repoUrl: "https://gitlab.com/a/b" }, fake, now)).rejects.toThrow("GitHub");
    expect(fake.publish).not.toHaveBeenCalled();
  });

  it("저장소 결과를 안내 문구로 바꾼다", async () => {
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b" }, publisher({ status: "ALREADY_IN_PROGRAM" }), now)).rejects.toThrow("이미 이 프로그램");
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b" }, publisher({ status: "UNAVAILABLE" }), now)).rejects.toThrow("등록 기간");
    await expect(publishPersonalProject(student, { programId, title: "a", description: "b" }, publisher({ status: "INVALID_DIVISION" }), now)).rejects.toThrow("분과");
  });
});
