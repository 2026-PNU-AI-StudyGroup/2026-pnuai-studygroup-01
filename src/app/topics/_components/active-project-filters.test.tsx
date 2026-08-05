import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveProjectFilters } from "@/app/topics/_components/active-project-filters";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("ActiveProjectFilters", () => {
  beforeEach(() => push.mockClear());

  it("정렬을 고르면 적용 버튼 없이 현재 필터를 보존한 첫 페이지 URL로 즉시 이동한다", () => {
    render(
      <ActiveProjectFilters
        phase="RECRUITING"
        counts={{ ACTIVE: 12, RECRUITING: 5, CLOSING_SOON: 2 }}
        programId="program-1"
        query="길찾기"
        sort="LATEST"
      />,
    );

    expect(screen.queryByRole("button", { name: "적용" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "프로젝트 정렬" }));
    fireEvent.click(screen.getByRole("option", { name: "마감 임박순" }));

    expect(push).toHaveBeenCalledWith(
      "/topics?phase=RECRUITING&programId=program-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0&sort=DEADLINE",
      { scroll: false },
    );
    expect(push.mock.calls[0]?.[0]).not.toContain("page=");
  });
});
