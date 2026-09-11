import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramAdvisorPanel } from "@/app/topics/_management/program-advisor-panel";
import type { ProgramAdvisorRow } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";

const programId = "40000000-0000-4000-8000-000000000001";

const serving: ProgramAdvisorRow = {
  userId: "60000000-0000-4000-8000-000000000001",
  name: "김위원",
  email: "kim@example.com",
  accountStatus: "ACTIVE",
  revokedAt: null,
  assignedTopicIds: [],
  activeToken: { expiresAt: new Date("2026-12-01T00:00:00Z") },
};

const withdrawn: ProgramAdvisorRow = {
  userId: "60000000-0000-4000-8000-000000000002",
  name: "박위원",
  email: "park@example.com",
  accountStatus: "DISABLED",
  revokedAt: new Date("2026-09-05T00:00:00Z"),
  assignedTopicIds: [],
  activeToken: null,
};

function panel(advisors: ProgramAdvisorRow[]) {
  return (
    <ProgramAdvisorPanel
      programId={programId}
      advisors={advisors}
      topics={[{ id: "70000000-0000-4000-8000-000000000001", title: "실내 길찾기", team: { name: "1팀", confirmedAt: null } }]}
      matrix={[]}
    />
  );
}

function sectionFor(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  const section = heading.closest("section");
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

describe("ProgramAdvisorPanel", () => {
  it("회수한 위원을 따로 세우고 다시 초대할 수 있게 한다", () => {
    // 예전에는 걸러 내서 화면에서 사라졌고, 계정을 다시 활성화해도 돌아오지 않아 운영자가
    // 다시 부르는 길을 찾을 수 없었다.
    render(panel([serving, withdrawn]));

    const revokedSection = sectionFor("회수한 위원");
    expect(within(revokedSection).getByText("박위원")).toBeInTheDocument();
    expect(within(revokedSection).getByText("초대 회수됨")).toBeInTheDocument();
    expect(within(revokedSection).getByRole("button", { name: "다시 초대" })).toBeEnabled();
  });

  it("현재 심사단 목록과 팀 할당에는 회수한 위원을 넣지 않는다", () => {
    render(panel([serving, withdrawn]));

    const listSection = sectionFor("자문위원 목록");
    expect(within(listSection).getByText("김위원")).toBeInTheDocument();
    expect(within(listSection).queryByText("박위원")).not.toBeInTheDocument();

    const assignSection = sectionFor("팀 할당");
    expect(within(assignSection).getByText("김위원")).toBeInTheDocument();
    expect(within(assignSection).queryByText("박위원")).not.toBeInTheDocument();
  });

  it("회수한 위원이 없으면 그 자리를 만들지 않는다", () => {
    render(panel([serving]));

    expect(screen.queryByRole("heading", { name: "회수한 위원" })).not.toBeInTheDocument();
  });

  it("심사단이 비어도 회수한 위원은 보여 준다", () => {
    // 전원을 회수한 프로그램에서 목록이 통째로 비면 되살릴 대상조차 볼 수 없다.
    render(panel([withdrawn]));

    expect(screen.getByText("이 프로그램에 초대한 자문위원이 없습니다.")).toBeInTheDocument();
    expect(within(sectionFor("회수한 위원")).getByRole("button", { name: "다시 초대" })).toBeEnabled();
  });

  it("탈퇴한 계정은 다시 초대하지 못하게 막고 이유를 밝힌다", () => {
    render(panel([{ ...withdrawn, accountStatus: "WITHDRAWN" }]));

    const revokedSection = sectionFor("회수한 위원");
    expect(within(revokedSection).getByRole("button", { name: "다시 초대" })).toBeDisabled();
    expect(within(revokedSection).getByText("탈퇴한 계정은 다시 초대할 수 없습니다.")).toBeInTheDocument();
  });
});
