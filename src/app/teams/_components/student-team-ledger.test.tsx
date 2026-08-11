import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StudentTeamLedger } from "@/app/teams/_components/student-team-ledger";
import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));

const team: StudentTeamSummary = {
  id: "team-1",
  name: "코드웨이브",
  description: "캠퍼스 접근성을 개선하는 팀",
  leaderId: "student-1",
  leaderName: "김학생",
  members: [
    { studentId: "student-1", name: "김학생", email: "one@pusan.ac.kr", role: "LEADER", joinedAt: new Date("2026-07-20"), profile: null },
    { studentId: "student-2", name: "이학생", email: "two@pusan.ac.kr", role: "MEMBER", joinedAt: new Date("2026-07-21"), profile: null },
  ],
  invitations: [],
  openRecruitmentCount: 1,
  pendingApplicantCount: 3,
  createdAt: new Date("2026-07-20"),
};

describe("StudentTeamLedger", () => {
  it("팀별 상태와 관리 동작을 계층화된 카드에 표시한다", () => {
    const { container } = render(<StudentTeamLedger teams={[team]} actorId="student-1" />);

    expect(screen.getByRole("list", { name: "참여 중인 팀 목록" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "코드웨이브" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "코드웨이브" })).not.toBeInTheDocument();
    expect(screen.getByText("캠퍼스 접근성을 개선하는 팀")).toBeInTheDocument();
    expect(screen.getByText("팀장")).toBeInTheDocument();
    expect(screen.getByText("2명")).toBeInTheDocument();
    expect(screen.getByText("김학생, 이학생")).toBeInTheDocument();
    expect(screen.getByText("3명")).toBeInTheDocument();
    const manageLink = screen.getByRole("link", { name: "팀 관리" });
    expect(manageLink).toHaveAttribute("href", "/teams/manage/team-1");
    expect(manageLink).toHaveClass("button-primary");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(container.querySelector("article")).toHaveClass("rounded-[var(--radius-panel)]");
    expect(container.querySelector("article > div")?.className).not.toContain("bg-[#e8efff]");
    expect(container.querySelector("li")).not.toHaveClass("record-row");
  });
});
