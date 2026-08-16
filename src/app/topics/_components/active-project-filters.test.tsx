import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveProjectFilters } from "@/app/topics/_components/active-project-filters";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("ActiveProjectFilters", () => {
  beforeEach(() => push.mockClear());

  it("분과를 고르면 두 프로젝트 조건과 검색어를 보존하고 첫 페이지로 이동한다", () => {
    render(<ActiveProjectFilters programId="program-1" query="길찾기" teamStatus="formed" reportStatus="overdue" divisions={[{ id: "division-1", name: "AI" }]} />);

    expect(screen.queryByRole("combobox", { name: "프로젝트 정렬" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "프로젝트 상태" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "AI" }));

    expect(push).toHaveBeenCalledWith("/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0&teamStatus=formed&reportStatus=overdue", { scroll: false });
  });
});
