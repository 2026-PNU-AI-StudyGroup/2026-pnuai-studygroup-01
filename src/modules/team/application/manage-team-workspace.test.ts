import { describe, expect, it, vi } from "vitest";

import {
  TeamDiscussionService,
  TeamMilestoneService,
  TeamNotFoundError,
  TeamWorkspaceQueryService,
} from "@/modules/team/application/manage-team-workspace";
import type {
  DiscussionPostWriter,
  MilestoneWriter,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import { InvalidMilestoneError } from "@/modules/team/domain/team-workspace-policy";

function dependencies() {
  const reader: TeamWorkspaceReader = {
    findWorkspaceForActor: vi.fn(),
    listForStudent: vi.fn(),
    listForProfessor: vi.fn(),
    listAll: vi.fn(),
    listForActor: vi.fn(),
  };
  const milestones: MilestoneWriter = {
    createMilestone: vi.fn(async () => ({ id: "milestone-1" })),
    updateMilestoneStatus: vi.fn(),
  };
  const discussion: DiscussionPostWriter = {
    createDiscussionPost: vi.fn(async () => ({ id: "post-1" })),
  };
  return { reader, milestones, discussion };
}

describe("팀 워크스페이스 기록", () => {
  it("대화 이력 페이지를 정규화해 조회 저장소에 전달한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.reader.findWorkspaceForActor).mockResolvedValue({} as never);
    const service = new TeamWorkspaceQueryService(deps.reader);
    await service.get({ id: "student-1", role: "STUDENT" }, "team-1", 3);
    expect(deps.reader.findWorkspaceForActor).toHaveBeenCalledWith("team-1", { id: "student-1", role: "STUDENT" }, 3);
  });

  it("팀원이 정규화된 마일스톤을 생성한다", async () => {
    const deps = dependencies();
    const service = new TeamMilestoneService(deps.milestones);
    const dueAt = new Date("2026-05-01T00:00:00Z");

    await service.createMilestone(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", title: "  중간 발표  ", dueAt, assigneeIds: ["student-2", "student-3", "student-2"] },
    );

    expect(deps.milestones.createMilestone).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      assigneeIds: ["student-2", "student-3"],
      title: "중간 발표",
      dueAt,
    });
  });

  it("기여 권한이 없는 사용자의 마일스톤 요청은 저장소 판정으로 거절한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.milestones.createMilestone).mockResolvedValue(null);
    const service = new TeamMilestoneService(deps.milestones);
    const professor = { id: "professor-1", role: "PROFESSOR" as const };

    await expect(service.createMilestone(professor, { teamId: "team-1", title: "교수 작성", dueAt: new Date("2026-05-01T00:00:00Z") })).rejects.toBeInstanceOf(TeamNotFoundError);
    expect(deps.milestones.createMilestone).toHaveBeenCalledOnce();
  });

  it("유효하지 않은 마감일을 영속화 전에 거부한다", async () => {
    const deps = dependencies();
    const service = new TeamMilestoneService(deps.milestones);

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

  it("팀 토론 내용을 정규화해 작성자와 함께 전달한다", async () => {
    const deps = dependencies();
    const service = new TeamDiscussionService(deps.discussion);
    await service.createDiscussionPost(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", content: "  회의는 금요일입니다.  " },
    );
    expect(deps.discussion.createDiscussionPost).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      content: "회의는 금요일입니다.",
    });
  });
});
