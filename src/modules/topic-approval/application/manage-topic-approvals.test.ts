import { describe, expect, it, vi } from "vitest";
import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import { TopicApprovalOperationError, TopicApprovalService, type TopicApprovalRepository } from "@/modules/topic-approval/application/manage-topic-approvals";

const actor = { id: "student-1", role: "STUDENT" as const, name: "김학생", email: "student@pusan.ac.kr", image: null };
const input = {
  programId: "program-1", title: "학생 제안", description: "설명",
  requiredSkills: ["TypeScript"], preferredSkills: [], roleExpectations: "개발", availabilityRequirement: "주 1회",
  applicationMode: "TEAM_ONLY" as const, applicationQuestions: [{ label: "동기", maxLength: 500, required: true }], capacity: 4,
  studentTeamId: "8f9c8d60-1e5c-4c6a-90e7-3a8c0e1f9c51",
};

function dependencies() {
  const repository: TopicApprovalRepository = {
    listProfessors: vi.fn(async () => []), create: vi.fn(async () => "topic-1"),
    listVisiblePage: vi.fn(async () => ({ items: [], page: 1, totalPages: 1, total: 0 })), findVisible: vi.fn(async () => null), decide: vi.fn(async () => "APPROVED" as const),
  };
  const programs: Pick<ProjectProgramRepository, "findOpen"> = {
    findOpen: vi.fn(async () => ({ id: "program-1", startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2026-12-31T00:00:00Z"), recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"), recruitmentEndsAt: new Date("2026-10-01T00:00:00Z"), executionStartsAt: new Date("2026-02-01T00:00:00Z"), executionEndsAt: new Date("2026-11-30T00:00:00Z"), submissionStartsAt: new Date("2026-11-01T00:00:00Z"), submissionEndsAt: new Date("2026-12-31T00:00:00Z"), advisorEnabled: true, studentProjectCreationEnabled: true, projectTeamMinSize: 2, projectTeamMaxSize: 6 })),
  };
  return { repository, programs };
}

describe("학생 프로젝트 승인", () => {
  it("교수 경로는 특정 교수를 필수로 지정한다", async () => {
    const { repository, programs } = dependencies();
    await expect(new TopicApprovalService(repository, programs).createStudentProposal(actor, { ...input, route: "PROFESSOR" })).rejects.toBeInstanceOf(TopicApprovalOperationError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("관리자 경로는 특정 관리자를 저장하지 않는다", async () => {
    const { repository, programs } = dependencies();
    await new TopicApprovalService(repository, programs).createStudentProposal(actor, { ...input, route: "ADMIN" });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      authorId: actor.id,
      route: "ADMIN",
      requestedProfessorId: null,
      studentTeamId: input.studentTeamId,
      recruitmentEnabled: false,
      applicationMode: "TEAM_ONLY",
      applicationQuestions: [],
      requiredSkills: [],
      preferredSkills: [],
      capacity: 1,
    }));
  });

  it("팀을 선택하지 않은 제안은 저장소 호출 전에 거부한다", async () => {
    const { repository, programs } = dependencies();

    await expect(new TopicApprovalService(repository, programs).createStudentProposal(actor, {
      ...input,
      studentTeamId: undefined,
      route: "ADMIN",
    })).rejects.toThrow("프로젝트를 제안할 팀을 선택해 주세요.");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("프로그램에서 학생 프로젝트 제안을 허용하지 않으면 저장하지 않는다", async () => {
    const { repository, programs } = dependencies();
    vi.mocked(programs.findOpen).mockResolvedValue({
      id: "program-1",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-12-31T00:00:00Z"),
      recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-10-01T00:00:00Z"),
      executionStartsAt: new Date("2026-02-01T00:00:00Z"),
      executionEndsAt: new Date("2026-11-30T00:00:00Z"),
      submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
      submissionEndsAt: new Date("2026-12-31T00:00:00Z"),
      advisorEnabled: true,
      studentProjectCreationEnabled: false,
      projectTeamMinSize: 2,
      projectTeamMaxSize: 6,
    });

    await expect(new TopicApprovalService(repository, programs).createStudentProposal(actor, { ...input, route: "ADMIN" }))
      .rejects.toThrow("이 프로그램은 학생 프로젝트 제안을 허용하지 않습니다.");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("지도교수가 없는 프로그램은 교수 승인 경로를 거부한다", async () => {
    const { repository, programs } = dependencies();
    vi.mocked(programs.findOpen).mockResolvedValue({
      id: "program-1",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-12-31T00:00:00Z"),
      recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-10-01T00:00:00Z"),
      executionStartsAt: new Date("2026-02-01T00:00:00Z"),
      executionEndsAt: new Date("2026-11-30T00:00:00Z"),
      submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
      submissionEndsAt: new Date("2026-12-31T00:00:00Z"),
      advisorEnabled: false,
      studentProjectCreationEnabled: true,
      projectTeamMinSize: 2,
      projectTeamMaxSize: 6,
    });

    await expect(new TopicApprovalService(repository, programs).createStudentProposal(actor, {
      ...input,
      route: "PROFESSOR",
      requestedProfessorId: "11111111-1111-4111-8111-111111111111",
    })).rejects.toThrow("지도교수가 없는 프로그램은 관리자에게만 승인을 요청할 수 있습니다.");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("교수는 지정 요청만 처리하도록 저장소에 역할과 신원을 전달한다", async () => {
    const { repository, programs } = dependencies();
    const professor = { ...actor, id: "professor-1", role: "PROFESSOR" as const };
    await new TopicApprovalService(repository, programs).decide(professor, { requestId: "request-1", decision: "APPROVE", reviewComment: " 승인 " });
    expect(repository.decide).toHaveBeenCalledWith(expect.objectContaining({ actorId: "professor-1", actorRole: "PROFESSOR", reviewComment: "승인" }));
  });

  it("기존 팀 구성이 달라진 요청은 새 제안을 안내한다", async () => {
    const { repository, programs } = dependencies();
    vi.mocked(repository.decide).mockResolvedValue("TEAM_CHANGED");
    const administrator = { ...actor, id: "admin-1", role: "ADMIN" as const };

    await expect(new TopicApprovalService(repository, programs).decide(administrator, {
      requestId: "request-1",
      decision: "APPROVE",
      reviewComment: "승인",
      studentTeamVersion: 2,
      teamCompositionConfirmed: true,
    })).rejects.toThrow("승인 요청 뒤 팀 구성이 변경되었습니다.");
  });

  it("교수 지도 화면에는 승인 대기 요청만 조회한다", async () => {
    const { repository, programs } = dependencies();
    const professor = { ...actor, id: "professor-1", role: "PROFESSOR" as const };

    await new TopicApprovalService(repository, programs).listPendingForReview(professor);

    expect(repository.listVisiblePage).toHaveBeenCalledWith(professor, 1, 5, "PENDING");
  });

  it("승인 상세 조회도 현재 사용자에게 보이는 요청만 저장소에 위임한다", async () => {
    const { repository, programs } = dependencies();
    const professor = { ...actor, id: "professor-1", role: "PROFESSOR" as const };

    await new TopicApprovalService(repository, programs).get(professor, "request-1");

    expect(repository.findVisible).toHaveBeenCalledWith(professor, "request-1");
  });
});
