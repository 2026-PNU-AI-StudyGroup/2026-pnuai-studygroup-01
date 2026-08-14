import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectApprovalFilters } from "@/app/project-approvals/_components/project-approval-filters";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const programs = [{ id: "program-1", name: "2026 캡스톤", category: "캡스톤 디자인" }];

describe("ProjectApprovalFilters", () => {
  beforeEach(() => push.mockReset());

  it("조회 시 현재 프로그램과 상태만 URL에 반영해 페이지를 초기화한다", () => {
    render(<ProjectApprovalFilters programs={programs} programId="program-1" status="PENDING" />);

    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    expect(push).toHaveBeenCalledWith("/project-approvals?programId=program-1&status=PENDING");
    expect(screen.getByRole("link", { name: "조건 초기화" })).toHaveAttribute("href", "/project-approvals");
  });

  it("선택된 조건이 없으면 초기화 링크를 표시하지 않는다", () => {
    render(<ProjectApprovalFilters programs={programs} />);

    expect(screen.queryByRole("link", { name: "조건 초기화" })).not.toBeInTheDocument();
  });
});
