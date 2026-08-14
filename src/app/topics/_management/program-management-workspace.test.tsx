import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgramManagementHeader } from "@/app/topics/_management/program-management-workspace";

vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/modules/project-voting/infrastructure/prisma-project-voting-repository", () => ({ PrismaProjectVotingRepository: class {} }));

const program = {
  id: "program-1",
  name: "2026 캡스톤",
  isPublic: true,
  endsAt: new Date("2099-12-31T00:00:00Z"),
};

describe("ProgramManagementHeader", () => {
  it("승인 대기가 있으면 해당 프로그램의 대기 요청으로 연결한다", () => {
    render(<ProgramManagementHeader program={program} tab="overview" pendingApprovalCount={2} />);

    expect(screen.getByRole("link", { name: "승인 대기 2건 · 검토하기" })).toHaveAttribute(
      "href",
      "/project-approvals?programId=program-1&status=PENDING",
    );
  });

  it("승인 대기가 없으면 검토 링크를 표시하지 않는다", () => {
    render(<ProgramManagementHeader program={program} tab="overview" pendingApprovalCount={0} />);

    expect(screen.queryByText("검토하기")).not.toBeInTheDocument();
  });
});
