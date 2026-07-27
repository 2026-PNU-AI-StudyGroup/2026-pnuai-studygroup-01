import { describe, expect, it, vi } from "vitest";

import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import type { TopicApplicationLister } from "@/modules/topic-application/application/topic-application-ports";

describe("ListOwnTopicApplicationsService", () => {
  it("지원 이력 페이지와 페이지 크기를 운영 범위로 정규화한다", async () => {
    const listByStudent = vi.fn(async (_studentId, page) => ({ items: [], page, totalPages: 1, total: 0, counts: { PENDING: 0, ACCEPTED: 0, REJECTED: 0 } }));
    const repository: TopicApplicationLister = { listByStudent, findByStudentAndTopic: vi.fn(async () => null) };

    await new ListOwnTopicApplicationsService(repository).execute({ id: "student-1", role: "STUDENT" }, -2, 100);

    expect(listByStudent).toHaveBeenCalledWith("student-1", 1, 20, undefined);
  });

  it("내 프로젝트 상태 필터를 저장소까지 전달한다", async () => {
    const listByStudent = vi.fn(async (_studentId, page) => ({ items: [], page, totalPages: 1, total: 0, counts: { PENDING: 0, ACCEPTED: 0, REJECTED: 0 } }));
    const repository: TopicApplicationLister = { listByStudent, findByStudentAndTopic: vi.fn(async () => null) };

    await new ListOwnTopicApplicationsService(repository).execute(
      { id: "student-1", role: "STUDENT" },
      2,
      20,
      "REJECTED",
    );

    expect(listByStudent).toHaveBeenCalledWith("student-1", 2, 20, "REJECTED");
  });

  it("특정 프로젝트 지원 상태도 현재 학생 범위로 조회한다", async () => {
    const findByStudentAndTopic = vi.fn(async () => null);
    const repository: TopicApplicationLister = { listByStudent: vi.fn(), findByStudentAndTopic };

    await new ListOwnTopicApplicationsService(repository).findForTopic({ id: "student-1", role: "STUDENT" }, "topic-1");

    expect(findByStudentAndTopic).toHaveBeenCalledWith("student-1", "topic-1");
  });
});
