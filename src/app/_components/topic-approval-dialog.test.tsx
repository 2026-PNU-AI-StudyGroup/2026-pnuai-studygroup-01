import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TopicApprovalDialog } from "@/app/_components/topic-approval-dialog";

vi.mock("@/app/_components/topic-approval-decision-form", () => ({
  TopicApprovalDecisionForm: () => <form aria-label="승인 결정 폼" />,
}));

const request = {
  id: "request-1",
  topicId: "topic-1",
  topicTitle: "접근성 지도 프로젝트",
  programId: "program-1",
  programName: "2026 캡스톤",
  programCategory: "캡스톤",
  requesterId: "student-1",
  requesterName: "김학생",
  route: "PROFESSOR" as const,
  requestedProfessorId: "professor-1",
  requestedProfessorName: "이교수",
  status: "PENDING" as const,
  reviewComment: "",
  createdAt: new Date("2026-08-13T00:00:00Z"),
  decidedAt: null,
  description: "휠체어 사용자를 위한 실내 길찾기를 만듭니다.",
  projectTeam: {
    name: "길잡이",
    members: [
      { id: "student-1", name: "김학생", role: "LEADER" as const },
      { id: "student-2", name: "박팀원", role: "MEMBER" as const },
    ],
  },
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("TopicApprovalDialog", () => {
  it("목록에서 필요한 등록 내용과 검토 폼을 모달로 연다", () => {
    render(<TopicApprovalDialog request={request} canDecide triggerLabel="검토" />);

    fireEvent.click(screen.getByRole("button", { name: "검토" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "접근성 지도 프로젝트" })).toBeInTheDocument();
    expect(screen.getByText("휠체어 사용자를 위한 실내 길찾기를 만듭니다.")).toBeInTheDocument();
    expect(screen.getByText("길잡이")).toBeInTheDocument();
    expect(screen.getAllByText("김학생")).toHaveLength(2);
    expect(screen.getByRole("form", { name: "승인 결정 폼" })).toBeInTheDocument();
    expect(screen.queryByText("필수 기술")).not.toBeInTheDocument();
  });

  it("학생은 결정 폼 없이 등록 내용만 확인한다", () => {
    render(<TopicApprovalDialog request={request} canDecide={false} triggerLabel="등록 내용 보기" />);

    fireEvent.click(screen.getByRole("button", { name: "등록 내용 보기" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.queryByRole("form", { name: "승인 결정 폼" })).not.toBeInTheDocument();
  });
});
