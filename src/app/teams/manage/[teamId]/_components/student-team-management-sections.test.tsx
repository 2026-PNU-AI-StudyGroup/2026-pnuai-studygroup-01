import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StudentTeamManagementSections } from "@/app/teams/manage/[teamId]/_components/student-team-management-sections";
import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";

vi.mock("@/app/teams/_components/student-team-controls", () => ({
  InviteStudentTeamMemberForm: () => <button>초대 보내기</button>,
  CancelStudentTeamInvitationForm: ({ email }: { email: string }) => <button>{`${email} 초대 철회`}</button>,
  TeamMemberActions: ({ studentName }: { studentName: string }) => <button>{studentName} 관리</button>,
  DeleteStudentTeamForm: () => <button>팀 삭제 실행</button>,
  LeaveStudentTeamForm: () => <button>팀 탈퇴</button>,
}));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));

const team: StudentTeamSummary = {
  id: "team-1",
  name: "코드웨이브",
  description: "캠퍼스 접근성을 개선하는 팀",
  leaderId: "student-1",
  leaderName: "김학생",
  members: [
    { studentId: "student-1", name: "김학생", email: "one@pusan.ac.kr", role: "LEADER", joinedAt: new Date("2026-07-20"), profile: { phone: "010-1111-2222", kakao: "kim_id", github: "", instagram: "" } },
    { studentId: "student-2", name: "이학생", email: "two@pusan.ac.kr", role: "MEMBER", joinedAt: new Date("2026-07-21"), profile: null },
  ],
  invitations: [
    { id: "invite-1", email: "three@pusan.ac.kr", status: "PENDING", createdAt: new Date("2026-07-22") },
  ],
  openRecruitmentCount: 1,
  pendingApplicantCount: 2,
  createdAt: new Date("2026-07-20"),
};

describe("StudentTeamManagementSections", () => {
  it("팀장 화면을 절제된 팀 헤더, 구성원·초대 패널과 삭제 영역으로 구성한다", () => {
    const { container } = render(<StudentTeamManagementSections team={team} actorId="student-1" recruitmentPosts={[]} />);

    expect(screen.getByRole("heading", { name: "코드웨이브" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "팀 구성원 목록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "김학생 연락처" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이학생 연락처" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이학생 관리" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "응답 대기 중인 팀 초대" })).toBeInTheDocument();
    expect(screen.getByText("three@pusan.ac.kr")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "팀 삭제 실행" })).toBeInTheDocument();
    expect(container.querySelector("header")).toHaveClass("rounded-[var(--radius-panel)]");
    expect(container.querySelector("header")?.className).toContain("bg-[#f1f5ff]");
    expect(screen.getByRole("heading", { name: "구성원" }).closest("section")?.parentElement).toHaveClass("xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]");
    expect(screen.getByRole("heading", { name: "팀 삭제" }).closest("section")).toHaveClass("border-t");
  });

  it("팀원에게는 초대와 삭제 기능을 표시하지 않는다", () => {
    render(<StudentTeamManagementSections team={team} actorId="student-2" recruitmentPosts={[]} />);

    expect(screen.queryByRole("button", { name: "초대 보내기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "팀 삭제 실행" })).not.toBeInTheDocument();
    expect(screen.getAllByText("팀원").length).toBeGreaterThan(0);
  });
});
