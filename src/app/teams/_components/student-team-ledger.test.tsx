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
    { studentId: "student-1", name: "김학생", email: "one@pusan.ac.kr", role: "LEADER", joinedAt: new Date("2026-07-20") },
    { studentId: "student-2", name: "이학생", email: "two@pusan.ac.kr", role: "MEMBER", joinedAt: new Date("2026-07-21") },
  ],
  invitations: [],
  openRecruitmentCount: 1,
  pendingApplicantCount: 3,
  createdAt: new Date("2026-07-20"),
};

describe("StudentTeamLedger", () => {
  it("팀 소개, 내 역할, 구성원, 검토 대기와 관리 기능을 한 평면 행에 유지한다", () => {
    const { container } = render(<StudentTeamLedger teams={[team]} actorId="student-1" />);

    expect(screen.getByRole("list", { name: "참여 중인 팀 목록" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "코드웨이브" })).toHaveAttribute("href", "/teams/manage/team-1");
    expect(screen.getByText("캠퍼스 접근성을 개선하는 팀")).toBeInTheDocument();
    expect(screen.getByText("팀장")).toBeInTheDocument();
    expect(screen.getByText("2명")).toBeInTheDocument();
    expect(screen.getByText("김학생, 이학생")).toBeInTheDocument();
    expect(screen.getByText("3명")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "팀 관리" })).toHaveAttribute("href", "/teams/manage/team-1");
    expect(container.querySelector("li")).toHaveClass("record-row");
    expect(container.querySelector("li")?.className).not.toContain("rounded-[var(--radius-panel)]");
  });
});
