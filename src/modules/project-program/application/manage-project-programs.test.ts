import { describe, expect, it, vi } from "vitest";
import { ProgramVoteResetConfirmationRequiredError, ProjectProgramOperationError, ProjectProgramService, type ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import { getProgramStartYear, InvalidProjectProgramError, normalizeProjectProgram } from "@/modules/project-program/domain/project-program-policy";

const programInput = {
  name: "캡스톤",
  category: "교과",
  description: "설명",
  startsAt: new Date("2026-03-01T00:00:00Z"),
  endsAt: new Date("2026-12-01T00:00:00Z"),
  recruitmentStartsAt: new Date("2026-03-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-11-01T00:00:00Z"),
  executionStartsAt: new Date("2026-03-15T00:00:00Z"),
  executionEndsAt: new Date("2026-11-15T00:00:00Z"),
  submissionStartsAt: new Date("2026-10-15T00:00:00Z"),
  submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
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
    changeStudentProjectPolicy: vi.fn(),
    changeIcon: vi.fn(),
    findOpen: vi.fn(),
    ...overrides,
  };
}

describe("프로젝트 프로그램 관리", () => {
  it("관리자가 운영·등록 기간을 가진 동적 프로그램을 개설한다", async () => {
    const value = repository({ create: vi.fn(async () => "program-1") });
    const programId = await new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      name: " PNU 창의융합 해커톤 ",
      category: " 교내 대회 ",
      description: " 설명 ",
      projectRegistrationStartsAt: new Date("2026-04-01"),
      projectRegistrationEndsAt: new Date("2026-09-01"),
      isPublic: true,
      votingPolicy: null,
    });
    expect(value.create).toHaveBeenCalledWith(expect.objectContaining({
      name: "PNU 창의융합 해커톤",
      projectRegistrationStartsAt: new Date("2026-04-01"),
      createdById: "admin",
      isPublic: true,
    }));
    expect(programId).toBe("program-1");
  });

  it("등록기간을 생략한 기존 호출은 운영기간으로 보완한다", async () => {
    const value = repository({ create: vi.fn(async () => "program-1") });
    await new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, programInput);
    expect(value.create).toHaveBeenCalledWith(expect.objectContaining({
      projectRegistrationStartsAt: programInput.startsAt,
      projectRegistrationEndsAt: programInput.endsAt,
      isPublic: false,
    }));
  });

  it("모집·수행·제출 기간은 운영 기간 안에 있고 각각 시작이 종료보다 앞서야 한다", () => {
    expect(() => normalizeProjectProgram({
      ...programInput,
      projectRegistrationStartsAt: programInput.startsAt,
      projectRegistrationEndsAt: programInput.endsAt,
      executionEndsAt: programInput.executionStartsAt,
    })).toThrow("수행 시작 시각은 종료 시각보다 앞서야 합니다.");

    expect(() => normalizeProjectProgram({
      ...programInput,
      projectRegistrationStartsAt: programInput.startsAt,
      projectRegistrationEndsAt: programInput.endsAt,
      submissionEndsAt: new Date("2027-01-01T00:00:00Z"),
    })).toThrow("제출 기간은 프로그램 운영 기간 안에 있어야 합니다.");
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
    const value = repository({ create: vi.fn(async () => "program-1") });
    await expect(new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      divisionNames: [],
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 1,
        voteLimitScope: "DIVISION",
        selfVotingAllowed: false,
        resultsVisibleDuringVoting: false,
        resultsVisibleAfterVoting: true,
      },
    })).rejects.toThrow("분과별 투표는 분과를 하나 이상 등록한 프로그램에서만 사용할 수 있습니다.");
    expect(value.create).not.toHaveBeenCalled();
  });

  it("투표 결과 공개 설정을 정규화 과정에서 그대로 보존한다", async () => {
    const value = repository({ create: vi.fn(async () => "program-1") });
    await new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
        resultsVisibleDuringVoting: true,
        resultsVisibleAfterVoting: false,
      },
    });

    expect(value.create).toHaveBeenCalledWith(expect.objectContaining({
      votingPolicy: expect.objectContaining({
        resultsVisibleDuringVoting: true,
        resultsVisibleAfterVoting: false,
      }),
    }));
  });

  it("프로그램 생성 시 분과 채점표와 보고서 정의를 검증해 함께 전달한다", async () => {
    const value = repository({ create: vi.fn(async () => "program-1") });
    await new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      divisionNames: [" 창업 "],
      rubricDefinitions: [{
        divisionName: "창업",
        title: " 공식 평가 ",
        gradingDueAt: new Date("2026-10-01T00:00:00Z"),
        audience: "STAFF_ONLY",
        criteria: [{ label: " 완성도 ", maxPoints: 40 }],
      }],
      reportDefinitions: [{ title: " 최종 보고서 ", dueAt: new Date("2026-11-01T00:00:00Z") }],
    });

    expect(value.create).toHaveBeenCalledWith(expect.objectContaining({
      divisionNames: ["창업"],
      rubricDefinitions: [expect.objectContaining({ title: "공식 평가", divisionName: "창업", criteria: [{ label: "완성도", maxPoints: 40 }] })],
      reportDefinitions: [{ title: "최종 보고서", dueAt: new Date("2026-11-01T00:00:00Z") }],
    }));
  });

  it("평가 항목이 없는 채점표가 포함되면 프로그램 생성을 거부한다", async () => {
    const value = repository({ create: vi.fn(async () => "program-1") });

    await expect(new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      rubricDefinitions: [{
        divisionName: null,
        title: "공식 평가",
        gradingDueAt: new Date("2026-10-01T00:00:00Z"),
        audience: "STAFF_ONLY",
        criteria: [],
      }],
    })).rejects.toThrow("채점표에는 평가 항목을 하나 이상 추가해 주세요.");

    expect(value.create).not.toHaveBeenCalled();
  });

  it("보고서 마감이 수행 기간 밖이면 프로그램 생성을 거부한다", async () => {
    const value = repository({ create: vi.fn(async () => "program-1") });
    await expect(new ProjectProgramService(value).create({ id: "admin", role: "ADMIN" }, {
      ...programInput,
      reportDefinitions: [{ title: "최종 보고서", dueAt: new Date("2026-11-30T00:00:00Z") }],
    })).rejects.toThrow("보고서 제출 마감은 수행 기간 안이어야 합니다.");
    expect(value.create).not.toHaveBeenCalled();
  });

  it("같은 시작 시각의 동일한 프로그램명을 거부한다", async () => {
    await expect(new ProjectProgramService(repository({ create: vi.fn(async () => "DUPLICATE" as const) })).create({ id: "admin", role: "ADMIN" }, programInput)).rejects.toThrow(new ProjectProgramOperationError("같은 시작 시각에 동일한 프로그램명이 있습니다."));
  });

  it("운영 시작 연도를 서울 시간대로 계산한다", () => {
    expect(getProgramStartYear(new Date("2025-12-31T15:00:00.000Z"))).toBe(2026);
  });

  it("관리자가 프로젝트 참여 방식과 팀 인원 정책을 변경한다", async () => {
    const value = repository({ changeStudentProjectPolicy: vi.fn(async () => true) });
    await new ProjectProgramService(value).changeStudentProjectPolicy({ id: "admin", role: "ADMIN" }, "program-1", { enabled: true, minSize: 2, maxSize: 6 });
    expect(value.changeStudentProjectPolicy).toHaveBeenCalledWith("program-1", { enabled: true, minSize: 2, maxSize: 6 });
  });

  it("팀 최대 인원이 최소 인원보다 작으면 정책 변경을 거부한다", async () => {
    const value = repository({ changeStudentProjectPolicy: vi.fn(async () => true) });
    await expect(new ProjectProgramService(value).changeStudentProjectPolicy({ id: "admin", role: "ADMIN" }, "program-1", { enabled: true, minSize: 7, maxSize: 6 })).rejects.toThrow("프로젝트 팀 최대 인원은 최소 인원 이상 100명 이하여야 합니다.");
    expect(value.changeStudentProjectPolicy).not.toHaveBeenCalled();
  });

  it("직접 지원형은 사용하지 않는 최소 인원을 1명으로 정규화한다", async () => {
    const value = repository({ changeStudentProjectPolicy: vi.fn(async () => true) });
    await new ProjectProgramService(value).changeStudentProjectPolicy(
      { id: "admin", role: "ADMIN" },
      "program-1",
      { enabled: false, minSize: 6, maxSize: 4 },
    );
    expect(value.changeStudentProjectPolicy).toHaveBeenCalledWith("program-1", { enabled: false, minSize: 1, maxSize: 4 });
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
      recruitmentStartsAt: programInput.recruitmentStartsAt,
      recruitmentEndsAt: programInput.recruitmentEndsAt,
      executionStartsAt: programInput.executionStartsAt,
      executionEndsAt: programInput.executionEndsAt,
      submissionStartsAt: programInput.submissionStartsAt,
      submissionEndsAt: programInput.submissionEndsAt,
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 1,
        voteLimitScope: "DIVISION",
        selfVotingAllowed: false,
        resultsVisibleDuringVoting: false,
        resultsVisibleAfterVoting: true,
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
