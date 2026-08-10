import { describe, expect, it, vi } from "vitest";
import { ProgramVoteResetConfirmationRequiredError, ProjectProgramOperationError, ProjectProgramService, type ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import { getProgramStartYear, InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";

const programInput = {
  name: "캡스톤",
  category: "교과",
  description: "설명",
  startsAt: new Date("2026-03-01T00:00:00Z"),
  endsAt: new Date("2026-12-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-11-01T00:00:00Z"),
  advisorEnabled: true,
  studentProjectCreationEnabled: false,
  icon: "FOLDER" as const,
};

function repository(overrides: Partial<ProjectProgramRepository> = {}): ProjectProgramRepository {
  return {
    create: vi.fn(),
    listAll: vi.fn(),
    listOpen: vi.fn(),
    listSidebarVisible: vi.fn(),
    findById: vi.fn(),
    updateSettings: vi.fn(async () => "UPDATED" as const),
    changeStatus: vi.fn(),
    changeStudentProjectCreation: vi.fn(),
    changeIcon: vi.fn(),
    findOpen: vi.fn(),
    ...overrides,
  };
}

describe("프로젝트 프로그램 관리", () => {
  it("관리자가 운영·등록 기간을 가진 동적 프로그램을 개설한다", async () => {
    const value = repository({ create: vi.fn(async () => "CREATED" as const) });
    await new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      name: " PNU 창의융합 해커톤 ",
      category: " 교내 대회 ",
      description: " 설명 ",
      projectRegistrationStartsAt: new Date("2026-04-01"),
      projectRegistrationEndsAt: new Date("2026-09-01"),
      votingPolicy: null,
    });
    expect(value.create).toHaveBeenCalledWith(expect.objectContaining({
      name: "PNU 창의융합 해커톤",
      projectRegistrationStartsAt: new Date("2026-04-01"),
      createdById: "admin",
    }));
  });

  it("등록기간을 생략한 기존 호출은 운영기간으로 보완한다", async () => {
    const value = repository({ create: vi.fn(async () => "CREATED" as const) });
    await new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, programInput);
    expect(value.create).toHaveBeenCalledWith(expect.objectContaining({
      projectRegistrationStartsAt: programInput.startsAt,
      projectRegistrationEndsAt: programInput.endsAt,
    }));
  });

  it("운영이 종료됐어도 진행 중인 투표 프로그램은 사이드바 목록에 포함한다", async () => {
    const now = new Date("2026-08-07T12:00:00+09:00");
    const value = repository({ listSidebarVisible: vi.fn(async () => []) });

    await new ProjectProgramService(value).listSidebarVisible(now);

    expect(value.listSidebarVisible).toHaveBeenCalledWith(now);
  });

  it("교수의 프로그램 개설을 거부한다", async () => {
    await expect(new ProjectProgramService(repository()).create({ id: "professor", role: "PROFESSOR" }, programInput)).rejects.toBeInstanceOf(InvalidProjectProgramError);
  });

  it("분과가 없으면 분과별 투표 프로그램 생성을 거부한다", async () => {
    const value = repository({ create: vi.fn(async () => "CREATED" as const) });
    await expect(new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      divisionNames: [],
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 1,
        voteLimitScope: "DIVISION",
        selfVotingAllowed: false,
        identityVisibility: "ANONYMOUS",
      },
    })).rejects.toThrow("분과별 투표는 분과를 하나 이상 등록한 프로그램에서만 사용할 수 있습니다.");
    expect(value.create).not.toHaveBeenCalled();
  });

  it("같은 시작 시각의 동일한 프로그램명을 거부한다", async () => {
    await expect(new ProjectProgramService(repository({ create: vi.fn(async () => "DUPLICATE" as const) })).create({ id: "admin", role: "ADMIN" }, programInput)).rejects.toThrow(new ProjectProgramOperationError("같은 시작 시각에 동일한 프로그램명이 있습니다."));
  });

  it("운영 시작 연도를 서울 시간대로 계산한다", () => {
    expect(getProgramStartYear(new Date("2025-12-31T15:00:00.000Z"))).toBe(2026);
  });

  it("관리자가 프로그램의 학생 프로젝트 제안 허용 여부를 변경한다", async () => {
    const value = repository({ changeStudentProjectCreation: vi.fn(async () => true) });
    await new ProjectProgramService(value).changeStudentProjectCreation({ id: "admin", role: "ADMIN" }, "program-1", true);
    expect(value.changeStudentProjectCreation).toHaveBeenCalledWith("program-1", true);
  });

  it("관리자가 프로그램 아이콘을 변경한다", async () => {
    const value = repository({ changeIcon: vi.fn(async () => true) });
    await new ProjectProgramService(value).changeIcon({ id: "admin", role: "ADMIN" }, "program-1", "ROCKET");
    expect(value.changeIcon).toHaveBeenCalledWith("program-1", "ROCKET");
  });

  it("표가 있는 투표 규칙 변경은 영향 정보를 포함한 확인 오류로 전달한다", async () => {
    const impact = {
      voteCount: 7,
      from: { voteLimit: 2, voteLimitScope: "PROGRAM" as const },
      to: { voteLimit: 1, voteLimitScope: "DIVISION" as const },
    };
    const value = repository({
      findById: vi.fn(async () => ({ ...programInput, id: "program-1", startYear: 2026, status: "OPEN" as const, openedAt: new Date(), topicCount: 2, teamCount: 1 })),
      updateSettings: vi.fn(async () => ({ status: "VOTE_RESET_CONFIRMATION_REQUIRED" as const, impact })),
    });
    const result = new ProjectProgramService(value).updateSettings({ id: "admin", role: "ADMIN" }, "program-1", {
      projectRegistrationStartsAt: programInput.startsAt,
      projectRegistrationEndsAt: programInput.endsAt,
      recruitmentEndsAt: programInput.recruitmentEndsAt,
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 1,
        voteLimitScope: "DIVISION",
        selfVotingAllowed: false,
        identityVisibility: "ANONYMOUS",
      },
    });
    await expect(result).rejects.toMatchObject({ impact } satisfies Partial<ProgramVoteResetConfirmationRequiredError>);
  });

  it("관리자가 아닌 사용자의 아이콘 변경을 거부한다", async () => {
    const value = repository();
    await expect(new ProjectProgramService(value).changeIcon({ id: "student", role: "STUDENT" }, "program-1", "ROCKET")).rejects.toBeInstanceOf(InvalidProjectProgramError);
    expect(value.changeIcon).not.toHaveBeenCalled();
  });
});
