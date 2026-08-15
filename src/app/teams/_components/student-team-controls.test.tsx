import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateStudentTeamForm } from "@/app/teams/_components/student-team-controls";

const { createStudentTeamAction, replace } = vi.hoisted(() => ({
  createStudentTeamAction: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/app/teams/_actions/student-team-actions", () => ({
  createStudentTeamAction,
  deleteStudentTeamAction: vi.fn(),
  inviteStudentTeamMemberAction: vi.fn(),
  leaveStudentTeamAction: vi.fn(),
  removeStudentTeamMemberAction: vi.fn(),
  respondStudentTeamInvitationAction: vi.fn(),
  transferStudentTeamLeadershipAction: vi.fn(),
}));

describe("CreateStudentTeamForm", () => {
  beforeEach(() => {
    createStudentTeamAction.mockReset();
    replace.mockReset();
  });

  it("팀 생성에 성공하면 생성 모달이 없는 팀 목록으로 돌아간다", async () => {
    createStudentTeamAction.mockResolvedValue({
      status: "success",
      message: "팀을 만들었습니다.",
      teamId: "team-1",
    });
    render(<CreateStudentTeamForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "팀 이름" }), { target: { value: "코드웨이브" } });
    fireEvent.submit(screen.getByRole("textbox", { name: "팀 이름" }).closest("form")!);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/teams"));
  });
});
