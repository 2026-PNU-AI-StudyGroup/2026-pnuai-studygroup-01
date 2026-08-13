import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeamPeopleSidebar } from "@/app/projects/[projectId]/_components/team-people-sidebar";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";

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
  it("프로젝트 팀원 목록에서 팀장에게만 팀장 뱃지를 표시한다", () => {
    render(
      <TeamPeopleSidebar
        advisorEnabled={false}
        professor={{ id: "professor-1", name: "김교수", profileImage: null }}
        assistants={[]}
        members={members}
      />,
    );

    for (const button of screen.getAllByRole("button", { name: "김팀장 상세 정보" })) {
      expect(within(button).getByText("팀장")).toBeInTheDocument();
    }
    for (const button of screen.getAllByRole("button", { name: "이팀원 상세 정보" })) {
      expect(within(button).queryByText("팀장")).not.toBeInTheDocument();
    }
  });
});
