import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdvisorProgramHistory } from "@/app/admin/users/_components/advisor-program-history";

const serving = {
  programId: "40000000-0000-4000-8000-000000000001",
  programName: "2026학년도 CSE 졸업과제",
  invitedAt: new Date("2026-09-01T00:00:00Z"),
  revokedAt: null,
  hasActiveLink: true,
};

const withdrawn = {
  programId: "40000000-0000-4000-8000-000000000002",
  programName: "제7회 PNU 창의융합AI해커톤",
  invitedAt: new Date("2026-08-01T00:00:00Z"),
  revokedAt: new Date("2026-09-05T00:00:00Z"),
  hasActiveLink: false,
};

describe("AdvisorProgramHistory", () => {
  it("참여 중과 회수된 프로그램을 함께 세우고 상태를 구분한다", () => {
    render(<AdvisorProgramHistory name="정민서" history={[serving, withdrawn]} />);

    const list = screen.getByRole("list", { name: "정민서 자문위원 참여 프로그램" });
    expect(within(list).getByText("2026학년도 CSE 졸업과제")).toBeInTheDocument();
    expect(within(list).getByText("제7회 PNU 창의융합AI해커톤")).toBeInTheDocument();
    expect(within(list).getByText("참여 중")).toBeInTheDocument();
    expect(within(list).getByText("회수됨")).toBeInTheDocument();
  });

  it("프로그램 이름이 그 프로그램 자문위원 화면으로 가는 링크다", () => {
    // 잠그거나 다시 부르는 일은 그쪽에서 한다. 어느 프로그램인지 알아도 찾아가는 것이 일이었다.
    render(<AdvisorProgramHistory name="정민서" history={[serving, withdrawn]} />);

    expect(screen.getByRole("link", { name: "2026학년도 CSE 졸업과제" }))
      .toHaveAttribute("href", `/topics/manage/${serving.programId}/advisors`);
    expect(screen.getByRole("link", { name: "제7회 PNU 창의융합AI해커톤" }))
      .toHaveAttribute("href", `/topics/manage/${withdrawn.programId}/advisors`);
  });

  it("접힌 상태에서도 참여 중인 프로그램 수를 알린다", () => {
    // 줄마다 펼쳐 두면 목록이 길어지기만 하므로, 접힌 요약이 상태를 말해야 한다.
    render(<AdvisorProgramHistory name="정민서" history={[serving, withdrawn]} />);

    expect(screen.getByText("더보기 · 참여 중 1개 / 전체 2개")).toBeInTheDocument();
  });

  it("전부 회수된 위원은 지난 프로그램 수로 알린다", () => {
    render(<AdvisorProgramHistory name="정민서" history={[withdrawn]} />);

    expect(screen.getByText("더보기 · 지난 프로그램 1개")).toBeInTheDocument();
  });

  it("심사단이지만 링크가 없으면 지금 들어올 수 없다고 적는다", () => {
    // 접속 차단이나 만료로 링크가 없는 상태다. 초대는 살아 있으니 회수와 구분해야 한다.
    render(<AdvisorProgramHistory name="정민서" history={[{ ...serving, hasActiveLink: false }]} />);

    expect(screen.getByText("참여 중 · 링크 없음")).toBeInTheDocument();
    expect(screen.queryByText("회수됨")).not.toBeInTheDocument();
  });

  it("초대 이력이 없으면 펼칠 것을 만들지 않는다", () => {
    render(<AdvisorProgramHistory name="정민서" history={[]} />);

    expect(screen.getByText("초대된 프로그램이 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
