import { describe, expect, it, vi } from "vitest";

import { ListAdminTopicPreviewService } from "@/modules/topic/application/list-admin-topic-preview";
import type { AdminTopicPreviewLister } from "@/modules/topic/application/topic-ports";

describe("ListAdminTopicPreviewService", () => {
  it("관리자는 비공개 프로그램 미리보기 조회를 사용할 수 있다", async () => {
    const listPublishedForAdmin = vi.fn(async (query) => ({ items: [], page: query.page, totalPages: 1, total: 0 }));
    const repository: AdminTopicPreviewLister = { listPublishedForAdmin, findPublishedForAdmin: vi.fn() };
    const actor = { id: "admin-1", name: "관리자", role: "ADMIN" as const };

    await new ListAdminTopicPreviewService(repository).execute(actor, { programId: "program-1", query: "  캡스톤  ", page: -1, topicIds: ["topic-1"] });

    expect(listPublishedForAdmin).toHaveBeenCalledWith(expect.objectContaining({ programId: "program-1", query: "캡스톤", page: 1, topicIds: ["topic-1"] }));
  });

  it("관리자가 아닌 사용자의 우회 호출을 거부한다", () => {
    const repository: AdminTopicPreviewLister = { listPublishedForAdmin: vi.fn(), findPublishedForAdmin: vi.fn() };
    const actor = { id: "student-1", name: "학생", role: "STUDENT" as const };

    expect(() => new ListAdminTopicPreviewService(repository).execute(actor, { programId: "program-1" })).toThrow("관리자만 비공개 프로그램을 미리 볼 수 있습니다.");
  });

  it("관리자는 비공개 프로그램의 공개된 프로젝트 상세를 조회할 수 있다", async () => {
    const findPublishedForAdmin = vi.fn().mockResolvedValue({ id: "topic-1" });
    const repository: AdminTopicPreviewLister = { listPublishedForAdmin: vi.fn(), findPublishedForAdmin };
    const actor = { id: "admin-1", name: "관리자", role: "ADMIN" as const };

    await new ListAdminTopicPreviewService(repository).find(actor, "topic-1");

    expect(findPublishedForAdmin).toHaveBeenCalledWith("topic-1");
  });
});
