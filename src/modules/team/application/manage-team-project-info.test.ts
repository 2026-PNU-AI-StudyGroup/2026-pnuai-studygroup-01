import { describe, expect, it, vi } from "vitest";

import {
  TeamProjectInfoForbiddenError,
  TeamProjectInfoNotInProgressError,
  TeamProjectInfoService,
  type TeamProjectInfoRepository,
} from "@/modules/team/application/manage-team-project-info";
import { InvalidTeamProjectInfoError } from "@/modules/team/domain/team-project-info-policy";

const actor = { id: "student-1", role: "STUDENT" as const };

function repository(overrides: Partial<TeamProjectInfoRepository> = {}): TeamProjectInfoRepository {
  return {
    findForActor: vi.fn(async () => ({
      teamId: "team-1",
      programName: "캡스톤디자인",
      title: "기존 프로젝트",
      description: "기존 설명",
      status: "IN_PROGRESS" as const,
      canEdit: true,
    })),
    update: vi.fn(async () => "UPDATED" as const),
    ...overrides,
  };
}

describe("TeamProjectInfoService", () => {
  it("팀장용 수정 정보를 반환한다", async () => {
    const result = await new TeamProjectInfoService(repository()).getForEdit(actor, "team-1");

    expect(result.title).toBe("기존 프로젝트");
  });

  it("일반 팀원의 직접 수정 화면 접근을 거부한다", async () => {
    await expect(new TeamProjectInfoService(repository({
      findForActor: vi.fn(async () => ({
        teamId: "team-1",
        programName: "캡스톤디자인",
        title: "기존 프로젝트",
        description: "기존 설명",
        status: "IN_PROGRESS" as const,
        canEdit: false,
      })),
    })).getForEdit(actor, "team-1")).rejects.toBeInstanceOf(TeamProjectInfoForbiddenError);
  });

  it("진행 중이 아닌 프로젝트는 수정하지 않는다", async () => {
    await expect(new TeamProjectInfoService(repository({
      update: vi.fn(async () => "NOT_IN_PROGRESS" as const),
    })).update(actor, "team-1", { title: "수정", description: "수정 설명" }))
      .rejects.toBeInstanceOf(TeamProjectInfoNotInProgressError);
  });

  it("프로젝트명과 설명을 정규화해 저장한다", async () => {
    const store = repository();

    await new TeamProjectInfoService(store).update(actor, "team-1", {
      title: "  새 프로젝트  ",
      description: "  새 설명  ",
    });

    expect(store.update).toHaveBeenCalledWith("team-1", actor, {
      title: "새 프로젝트",
      description: "새 설명",
    });
  });

  it("빈 프로젝트 설명을 거부한다", async () => {
    await expect(new TeamProjectInfoService(repository()).update(actor, "team-1", {
      title: "프로젝트",
      description: "   ",
    })).rejects.toBeInstanceOf(InvalidTeamProjectInfoError);
  });
});
