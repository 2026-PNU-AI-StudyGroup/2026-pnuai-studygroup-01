import { describe, expect, it, vi } from "vitest";

import { ProjectPreparationOperationError, ProjectPreparationService, type ProjectPreparationRepository } from "@/modules/topic-approval/application/manage-project-preparation";

const student = { id: "student-1", role: "STUDENT" as const, name: "김학생", email: "student@example.com", image: null };

function repository(outcome: "UPDATED" | "NOT_FOUND" | "FORBIDDEN" | "UNAVAILABLE" = "UPDATED") {
  return { updatePreparation: vi.fn(async () => outcome) } satisfies ProjectPreparationRepository;
}

describe("ProjectPreparationService", () => {
  it("프로젝트 등록 팀장만 프로젝트 팀명과 대표를 준비 단계에서 갱신한다", async () => {
    const store = repository();
    const now = new Date("2026-08-16T00:00:00Z");
    await new ProjectPreparationService(store, () => now).update(student, {
      projectId: "project-1", projectTeamName: " 프로젝트 팀 ", projectRepresentativeId: "student-2", title: " 프로젝트 ", description: " 설명 ",
    });
    expect(store.updatePreparation).toHaveBeenCalledWith(expect.objectContaining({
      actor: student,
      projectTeamName: "프로젝트 팀",
      projectRepresentativeId: "student-2",
      title: "프로젝트",
      description: "설명",
      updatedAt: now,
    }));
  });

  it("등록자가 아니면 대표자와 프로젝트 정보를 바꿀 수 없다", async () => {
    const store = repository("FORBIDDEN");
    await expect(new ProjectPreparationService(store).update(student, {
      projectId: "project-1", projectTeamName: "프로젝트 팀", projectRepresentativeId: "student-2", title: "프로젝트", description: "설명",
    })).rejects.toThrow(ProjectPreparationOperationError);
  });
});
