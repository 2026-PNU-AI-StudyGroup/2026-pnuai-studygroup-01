import { describe, expect, it, vi } from "vitest";
import { RecruitmentOperationError, RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";

describe("학생 팀원 모집", () => {
  it("열린 모집과 전체 지원 이력 페이지를 함께 조회한다", async () => {
    const repository = { list: vi.fn(async () => ({ posts: [], formingTeams: [], page: 1, totalPages: 1, total: 0, applicationHistory: [], historyPage: 1, historyTotalPages: 1, historyTotal: 0 })), createPost: vi.fn(), apply: vi.fn(), findDecisionTarget: vi.fn() };
    const decisions = { findDecisionState: vi.fn(), accept: vi.fn(), reject: vi.fn() };
    await new RecruitmentService(repository, decisions).list({ id: "student", role: "STUDENT" }, 2, 3);
    expect(repository.list).toHaveBeenCalledWith("student", 2, 3);
  });

  it("구성 단계 팀원이 구조화 모집 글을 등록한다", async () => {
    const repository = { list: vi.fn(), createPost: vi.fn(async () => true), apply: vi.fn(), findDecisionTarget: vi.fn() };
    const decisions = { findDecisionState: vi.fn(), accept: vi.fn(), reject: vi.fn() };
    await new RecruitmentService(repository, decisions).createPost({ id: "student", role: "STUDENT" }, {
      teamId: "team", title: " 개발자 모집 ", content: " 함께 개발합니다 ", requiredSkills: [" TypeScript "], roleNeeded: " 백엔드 ", availability: " 주말 ",
    });
    expect(repository.createPost).toHaveBeenCalledWith(expect.objectContaining({ title: "개발자 모집", requiredSkills: ["TypeScript"] }));
  });

  it("비학생의 모집 글 생성을 저장 전에 거부한다", async () => {
    const repository = { list: vi.fn(), createPost: vi.fn(), apply: vi.fn(), findDecisionTarget: vi.fn() };
    const decisions = { findDecisionState: vi.fn(), accept: vi.fn(), reject: vi.fn() };
    await expect(new RecruitmentService(repository, decisions).createPost({ id: "professor", role: "PROFESSOR" }, {
      teamId: "team", title: "모집", content: "내용", requiredSkills: ["TS"], roleNeeded: "개발", availability: "주말",
    })).rejects.toBeInstanceOf(RecruitmentOperationError);
    expect(repository.createPost).not.toHaveBeenCalled();
  });
});
