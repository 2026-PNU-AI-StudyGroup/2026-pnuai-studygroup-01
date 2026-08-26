import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { projectTeamMembershipAction } from "@/app/projects/[projectId]/_actions/project-team-membership-actions";
import { TeamPeopleSidebar } from "@/app/projects/[projectId]/_components/team-people-sidebar";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/projects/[projectId]/_actions/project-team-membership-actions", () => ({
  projectTeamMembershipAction: vi.fn(),
}));
vi.mock("@/shared/ui/custom-select", () => ({
  CustomSelect: ({ name, ariaLabel, options, value, onValueChange, disabled }: {
    name: string;
    ariaLabel: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select name={name} aria-label={ariaLabel} value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">선택하세요</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));

const members: TeamWorkspace["members"] = [
  {
    id: "leader-1",
    name: "김팀장",
    email: "leader@pusan.ac.kr",
    role: "LEADER",
    department: null,
    studentNumber: null,
    grade: null,
    phoneNumber: null,
    contactEmail: null,
    profileImage: null,
    profile: null,
  },
  {
    id: "member-1",
    name: "이팀원",
    email: "member@pusan.ac.kr",
    role: "MEMBER",
    department: null,
    studentNumber: null,
    grade: null,
    phoneNumber: null,
    contactEmail: null,
    profileImage: null,
    profile: null,
  },
];

describe("TeamPeopleSidebar", () => {
  const defaults = {
    advisorEnabled: false,
    professor: { id: "professor-1", name: "김교수", profileImage: null },
    assistants: [],
    projectId: "50000000-0000-4000-8000-000000000001",
    projectTeamId: "60000000-0000-4000-8000-000000000001",
    membershipChangesEnabled: true,
    invitations: [],
  };

  it("프로젝트 팀원 목록에서 팀장에게만 팀장 뱃지를 표시한다", () => {
    render(
      <TeamPeopleSidebar
        {...defaults}
        members={members}
        actorId="leader-1"
        canManageMembers
      />,
    );

    for (const button of screen.getAllByRole("button", { name: "김팀장 상세 정보" })) {
      expect(within(button).getByText("팀장")).toBeInTheDocument();
    }
    for (const button of screen.getAllByRole("button", { name: "이팀원 상세 정보" })) {
      expect(within(button).queryByText("팀장")).not.toBeInTheDocument();
    }
  });

  it("별도 팀원 관리 영역 없이 권한 있는 사용자의 행 액션을 표시한다", () => {
    render(
      <TeamPeopleSidebar
        {...defaults}
        members={members}
        actorId="professor-1"
        canManageMembers
      />,
    );

    expect(screen.queryByRole("heading", { name: "팀원 관리" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "이팀원 팀장 위임" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "이팀원 프로젝트 팀에서 제외" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "김팀장 팀장 인계 후 제외" })).toHaveLength(2);
  });

  it("일반 팀원에게는 본인 탈퇴만 표시한다", () => {
    render(
      <TeamPeopleSidebar
        {...defaults}
        members={members}
        actorId="member-1"
        canManageMembers={false}
      />,
    );

    expect(screen.getAllByRole("button", { name: "이팀원 프로젝트 팀 탈퇴" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "김팀장 팀장 인계 후 제외" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이팀원 팀장 위임" })).not.toBeInTheDocument();
  });

  it("팀장 제외 모달에서 활성 일반 팀원에게만 인계를 요구한다", () => {
    render(
      <TeamPeopleSidebar
        {...defaults}
        members={members}
        actorId="professor-1"
        canManageMembers
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "김팀장 팀장 인계 후 제외" })[0]);

    const dialog = screen.getByRole("dialog", { name: "팀장 인계 후 제외" });
    expect(within(dialog).getByLabelText("인계할 팀장")).toHaveTextContent("이팀원");
    expect(within(dialog).getByRole("button", { name: "팀장 인계 후 제외" })).toBeDisabled();
  });

  it("인계할 팀원이 없으면 팀장 제거를 막는다", () => {
    render(
      <TeamPeopleSidebar
        {...defaults}
        members={[members[0]]}
        actorId="professor-1"
        canManageMembers
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "김팀장 팀장 인계 후 제외" })[0]);

    const dialog = screen.getByRole("dialog", { name: "팀장 인계 후 제외" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("인계할 팀원이 없어 팀장을 제거할 수 없습니다.");
    expect(within(dialog).getByRole("button", { name: "팀장 인계 후 제외" })).toBeDisabled();
  });

  it("이전 작업의 오류를 다음 팀원 모달에 표시하지 않는다", async () => {
    vi.mocked(projectTeamMembershipAction).mockResolvedValueOnce({
      status: "error",
      message: "현재 구성과 충돌하여 변경하지 못했습니다.",
    });
    render(
      <TeamPeopleSidebar
        {...defaults}
        members={members}
        actorId="professor-1"
        canManageMembers
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "이팀원 프로젝트 팀에서 제외" })[0]);
    let dialog = screen.getByRole("dialog", { name: "팀원 제외" });
    fireEvent.click(within(dialog).getByRole("button", { name: "제외" }));
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("현재 구성과 충돌하여 변경하지 못했습니다."));
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));

    fireEvent.click(screen.getAllByRole("button", { name: "이팀원 팀장 위임" })[0]);
    dialog = screen.getByRole("dialog", { name: "팀장 위임" });
    expect(within(dialog).queryByText("현재 구성과 충돌하여 변경하지 못했습니다.")).not.toBeInTheDocument();
  });
});
