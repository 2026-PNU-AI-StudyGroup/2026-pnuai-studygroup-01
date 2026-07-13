import { describe, expect, it, vi } from "vitest";

import { TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import type {
  MilestoneWriter,
  ProgressUpdateWriter,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import { InvalidMilestoneError } from "@/modules/team/domain/team-workspace-policy";

function dependencies() {
  const reader: TeamWorkspaceReader = {
    findWorkspaceForActor: vi.fn(),
    listForStudent: vi.fn(),
    listForProfessor: vi.fn(),
    listAll: vi.fn(),
  };
  const milestones: MilestoneWriter = {
    createMilestone: vi.fn(async () => ({ id: "milestone-1" })),
    updateMilestoneStatus: vi.fn(),
  };
  const progress: ProgressUpdateWriter = {
    createProgressUpdate: vi.fn(async () => ({ id: "progress-1" })),
  };
  return { reader, milestones, progress };
}

describe("팀 워크스페이스 기록", () => {
  it("팀원이 정규화된 마일스톤을 생성한다", async () => {
    const deps = dependencies();
    const service = new TeamWorkspaceService(
      deps.reader,
      deps.milestones,
      deps.progress,
    );
    const dueAt = new Date("2026-05-01T00:00:00Z");

    await service.createMilestone(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", title: "  중간 발표  ", dueAt },
    );

    expect(deps.milestones.createMilestone).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      title: "중간 발표",
      dueAt,
    });
  });

  it("인증된 사용자만 진행 기록 작성자로 전달한다", async () => {
    const deps = dependencies();
    const service = new TeamWorkspaceService(
      deps.reader,
      deps.milestones,
      deps.progress,
    );

    await service.createProgressUpdate(
      { id: "professor-1", role: "PROFESSOR" },
      {
        teamId: "team-1",
        content: "  설계 완료  ",
        risk: "  일정  ",
        nextAction: "  구현  ",
      },
    );

    expect(deps.progress.createProgressUpdate).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      content: "설계 완료",
      risk: "일정",
      nextAction: "구현",
    });
  });

  it("유효하지 않은 마감일을 영속화 전에 거부한다", async () => {
    const deps = dependencies();
    const service = new TeamWorkspaceService(
      deps.reader,
      deps.milestones,
      deps.progress,
    );

    await expect(
      service.createMilestone(
        { id: "student-1", role: "STUDENT" },
        {
          teamId: "team-1",
          title: "중간 발표",
          dueAt: new Date("invalid"),
        },
      ),
    ).rejects.toBeInstanceOf(InvalidMilestoneError);
    expect(deps.milestones.createMilestone).not.toHaveBeenCalled();
  });
});
