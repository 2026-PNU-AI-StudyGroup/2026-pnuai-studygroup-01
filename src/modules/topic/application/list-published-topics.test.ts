import { describe, expect, it, vi } from "vitest";

import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import type { PublicTopicLister } from "@/modules/topic/application/topic-ports";

describe("ListPublishedTopicsService", () => {
  it("검색·상태·정렬·페이지 입력을 정규화해 저장소에 전달한다", async () => {
    const listPublished = vi.fn(async (query) => ({ items: [], page: query.page, totalPages: 1, total: 0, counts: { ACTIVE: 0, RECRUITING: 0, CLOSING_SOON: 0 } }));
    const repository: PublicTopicLister = { listPublished, findPublished: vi.fn(async () => null) };
    const now = new Date("2026-07-17T00:00:00+09:00");

    await new ListPublishedTopicsService(repository).execute({ viewerId: "student-1", query: `  ${"가".repeat(120)}  `, phase: "CLOSING_SOON", sort: "DEADLINE", page: -3, now });

    expect(listPublished).toHaveBeenCalledWith(expect.objectContaining({ viewerId: "student-1", query: "가".repeat(100), phase: "CLOSING_SOON", sort: "DEADLINE", page: 1, pageSize: 10, now }));
  });

  it("알 수 없는 필터는 진행 중·최신순으로 안전하게 되돌린다", async () => {
    const listPublished = vi.fn(async (query) => ({ items: [], page: query.page, totalPages: 1, total: 0, counts: { ACTIVE: 0, RECRUITING: 0, CLOSING_SOON: 0 } }));
    const repository: PublicTopicLister = { listPublished, findPublished: vi.fn(async () => null) };

    await new ListPublishedTopicsService(repository).execute({ phase: "INVALID", sort: "INVALID", page: Number.NaN });

    expect(listPublished).toHaveBeenCalledWith(expect.objectContaining({ phase: "ACTIVE", sort: "LATEST", page: 1 }));
  });
});
