import { describe, expect, it, vi } from "vitest";

import {
  RecruitmentCommandService,
  RecruitmentOperationError,
  RecruitmentQueryService,
  type RecruitmentReader,
  type RecruitmentWriter,
} from "@/modules/recruitment/application/manage-recruitment";

function reader(overrides: Partial<RecruitmentReader> = {}): RecruitmentReader {
  return {
    listPosts: vi.fn(async () => ({ posts: [], page: 1, totalPages: 1, total: 0 })),
    listAuthoredPosts: vi.fn(async () => ({ posts: [], page: 1, totalPages: 1, total: 0 })),
    findPostApplications: vi.fn(async () => null),
    listApplicationHistory: vi.fn(async () => ({ applications: [], page: 1, totalPages: 1, total: 0 })),
    listFormingTeams: vi.fn(async () => []),
    findDecisionTarget: vi.fn(async () => null),
    ...overrides,
  };
}

function writer(overrides: Partial<RecruitmentWriter> = {}): RecruitmentWriter {
  return {
    createPost: vi.fn(async () => false),
    apply: vi.fn(async () => "UNAVAILABLE" as const),
    ...overrides,
  };
}

function decisions() {
  return { findDecisionState: vi.fn(), accept: vi.fn(), reject: vi.fn() };
}

describe("학생 팀원 모집", () => {
  it("공개 모집, 내 작성 글, 보낸 지원 이력을 서로 다른 조회로 읽는다", async () => {
    const repo = reader();
    const service = new RecruitmentQueryService(repo);

    await service.listPosts({ id: "student", role: "STUDENT" }, 2);
    await service.listAuthoredPosts({ id: "student", role: "STUDENT" }, 3);
    await service.listApplicationHistory({ id: "student", role: "STUDENT" }, 4);

    expect(repo.listPosts).toHaveBeenCalledWith("student", 2);
    expect(repo.listAuthoredPosts).toHaveBeenCalledWith("student", 3);
    expect(repo.listApplicationHistory).toHaveBeenCalledWith("student", 4);
  });

  it("작성자와 관리자의 지원자 조회 권한을 저장소 조회 조건으로 전달한다", async () => {
    const repo = reader();
    const service = new RecruitmentQueryService(repo);

    await service.getPostApplications({ id: "author", role: "STUDENT" }, "post");
    await service.getPostApplications({ id: "admin", role: "ADMIN" }, "post");

    expect(repo.findPostApplications).toHaveBeenNthCalledWith(1, "post", { actorId: "author", isAdmin: false });
    expect(repo.findPostApplications).toHaveBeenNthCalledWith(2, "post", { actorId: "admin", isAdmin: true });
  });

  it("교수의 모집 지원자 조회를 저장소 호출 전에 거부한다", async () => {
    const repo = reader();
    const service = new RecruitmentQueryService(repo);

    await expect(service.getPostApplications({ id: "professor", role: "PROFESSOR" }, "post")).rejects.toBeInstanceOf(RecruitmentOperationError);
    expect(repo.findPostApplications).not.toHaveBeenCalled();
  });

  it("관리자의 지원 결정을 관리자 권한으로 위임한다", async () => {
    const query = reader({
      findDecisionTarget: vi.fn(async () => "topic-application"),
    });
    const decisionRepository = decisions();
    decisionRepository.accept.mockResolvedValue("ACCEPTED");

    await new RecruitmentCommandService(
      writer(),
      query,
      decisionRepository,
    ).decide({ id: "admin", role: "ADMIN" }, "application", "ACCEPT");

    expect(query.findDecisionTarget).toHaveBeenCalledWith("application", { actorId: "admin", isAdmin: true });
    expect(decisionRepository.accept).toHaveBeenCalledWith("topic-application", { id: "admin", isAdmin: true }, expect.any(Date));
  });

  it("구성 단계 팀원이 구조화 모집 글을 등록한다", async () => {
    const store = writer({ createPost: vi.fn(async () => true) });
    await new RecruitmentCommandService(
      store,
      reader(),
      decisions(),
    ).createPost({ id: "student", role: "STUDENT" }, {
      teamId: "team", title: " 개발자 모집 ", content: " 함께 개발합니다 ", requiredSkills: [" TypeScript "], roleNeeded: " 백엔드 ", availability: " 주말 ",
    });
    expect(store.createPost).toHaveBeenCalledWith(expect.objectContaining({ title: "개발자 모집", requiredSkills: ["TypeScript"] }));
  });

  it("비학생의 모집 글 생성을 저장 전에 거부한다", async () => {
    const store = writer();
    await expect(new RecruitmentCommandService(
      store,
      reader(),
      decisions(),
    ).createPost({ id: "professor", role: "PROFESSOR" }, {
      teamId: "team", title: "모집", content: "내용", requiredSkills: ["TS"], roleNeeded: "개발", availability: "주말",
    })).rejects.toBeInstanceOf(RecruitmentOperationError);
    expect(store.createPost).not.toHaveBeenCalled();
  });
});
