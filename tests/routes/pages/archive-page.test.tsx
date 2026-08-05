import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import ArchivePage from "@/app/archive/page";

describe("지난 프로젝트 이전 주소", () => {
  it("통합 탐색이 지원하는 검색과 페이지 계약만 보존한다", async () => {
    await ArchivePage({
      searchParams: Promise.resolve({
        page: "2",
        q: "로봇",
        year: "2025",
        category: "캡스톤",
      }),
    });

    expect(redirect).toHaveBeenCalledWith(
      "/topics?view=past&page=2&q=%EB%A1%9C%EB%B4%87",
    );
  });
});
