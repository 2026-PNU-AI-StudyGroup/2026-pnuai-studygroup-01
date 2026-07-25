import { describe, expect, it, vi } from "vitest";
import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import { TopicApprovalOperationError, TopicApprovalService, type TopicApprovalRepository } from "@/modules/topic-approval/application/manage-topic-approvals";

const actor = { id: "student-1", role: "STUDENT" as const, name: "김학생", email: "student@pusan.ac.kr", image: null };
const input = {
  programId: "program-1", title: "학생 제안", description: "설명",
  requiredSkills: ["TypeScript"], preferredSkills: [], roleExpectations: "개발", availabilityRequirement: "주 1회",
  applicationMode: "TEAM_ONLY" as const, applicationQuestions: [{ label: "동기", maxLength: 500, required: true }], capacity: 4,
  recruitmentStartsAt: new Date("2026-08-01T00:00:00Z"), recruitmentEndsAt: new Date("2026-08-10T00:00:00Z"),
  executionStartsAt: new Date("2026-08-11T00:00:00Z"), executionEndsAt: new Date("2026-09-10T00:00:00Z"),
  submissionStartsAt: new Date("2026-09-01T00:00:00Z"), submissionEndsAt: new Date("2026-09-20T00:00:00Z"),
};

function dependencies() {
  const repository: TopicApprovalRepository = {
    listProfessors: vi.fn(async () => []), create: vi.fn(async () => "topic-1"),
    listVisible: vi.fn(async () => []), decide: vi.fn(async () => "APPROVED" as const),
  };
  const programs: Pick<ProjectProgramRepository, "findOpen"> = {
    findOpen: vi.fn(async () => ({ id: "program-1", academicCycleId: "cycle-1", startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2026-12-31T00:00:00Z") })),
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
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ authorId: actor.id, route: "ADMIN", requestedProfessorId: null }));
  });

  it("교수는 지정 요청만 처리하도록 저장소에 역할과 신원을 전달한다", async () => {
    const { repository, programs } = dependencies();
    const professor = { ...actor, id: "professor-1", role: "PROFESSOR" as const };
    await new TopicApprovalService(repository, programs).decide(professor, { requestId: "request-1", decision: "APPROVE", reviewComment: " 승인 " });
    expect(repository.decide).toHaveBeenCalledWith(expect.objectContaining({ actorId: "professor-1", actorRole: "PROFESSOR", reviewComment: "승인" }));
  });
});
