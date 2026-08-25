import { describe, expect, it, vi } from "vitest";

import { PROJECT_LIST_PAGE_SIZE } from "@/modules/topic/application/topic-ports";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import type { PublicTopicLister } from "@/modules/topic/application/topic-ports";

describe("ListPublishedTopicsService", () => {
  it("검색·분과·페이지 입력을 정규화해 저장소에 전달한다", async () => {
    const listPublished = vi.fn(async (query) => ({ items: [], page: query.page, totalPages: 1, total: 0 }));
    const repository: PublicTopicLister = { listPublished, findPublished: vi.fn(async () => null) };
    const now = new Date("2026-07-17T00:00:00+09:00");

    await new ListPublishedTopicsService(repository).execute({ viewerId: "student-1", divisionId: "division-1", query: `  ${"가".repeat(120)}  `, page: -3, now });

    expect(listPublished).toHaveBeenCalledWith(expect.objectContaining({ viewerId: "student-1", divisionId: "division-1", query: "가".repeat(100), page: 1, pageSize: PROJECT_LIST_PAGE_SIZE, now }));
  });

  it("유효하지 않은 페이지는 첫 페이지로 안전하게 되돌린다", async () => {
    const listPublished = vi.fn(async (query) => ({ items: [], page: query.page, totalPages: 1, total: 0 }));
    const repository: PublicTopicLister = { listPublished, findPublished: vi.fn(async () => null) };

    await new ListPublishedTopicsService(repository).execute({ page: Number.NaN });

    expect(listPublished).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });
});
