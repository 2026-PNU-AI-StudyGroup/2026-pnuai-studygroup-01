import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectApprovalLedger } from "@/app/_components/project-approval-ledger";
import type { TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";

vi.mock("@/app/_components/topic-approval-decision-form", () => ({
  TopicApprovalDecisionForm: ({ requestId }: { requestId: string }) => <button>요청 {requestId} 검토</button>,
}));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));

const request: TopicApprovalRequestSummary = {
  id: "request-1",
  topicId: "topic-1",
  topicTitle: "접근성 지도 프로젝트",
  requesterId: "student-1",
  requesterName: "김학생",
  route: "PROFESSOR",
  requestedProfessorId: "professor-1",
  requestedProfessorName: "박교수",
  status: "PENDING",
  reviewComment: "",
  createdAt: new Date("2026-07-24T09:00:00+09:00"),
  decidedAt: null,
};

describe("ProjectApprovalLedger", () => {
  it("승인 요청을 상태, 제안자, 검토 요청 대상과 검토 액션을 갖춘 평면 행으로 표시한다", () => {
    const { container } = render(<ProjectApprovalLedger requests={[request]} student={false} />);

    expect(screen.getByRole("list", { name: "프로젝트 승인 요청 목록" })).toBeInTheDocument();
    expect(screen.getByText("접근성 지도 프로젝트")).toBeInTheDocument();
    expect(screen.getByText("검토 대기")).toBeInTheDocument();
    expect(screen.getByText("김학생")).toBeInTheDocument();
    expect(screen.getByText("박교수 교수")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "요청 request-1 검토" })).toBeInTheDocument();
    expect(container.querySelector("li")).toHaveClass("record-row");
    expect(container.querySelector("li")?.className).not.toContain("rounded-[var(--radius-panel)]");
  });

  it("학생에게 처리된 검토 의견을 같은 열에 표시한다", () => {
    render(<ProjectApprovalLedger requests={[{ ...request, status: "APPROVED", reviewComment: "공개 승인" }]} student />);

    expect(screen.getByText("공개 승인")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /검토/ })).not.toBeInTheDocument();
  });

  it("관리자 화면에서는 공통 관리 패널과 넓은 화면 전용 열 구조를 사용한다", () => {
    const { container } = render(<ProjectApprovalLedger requests={[request]} student={false} adminSurface />);

    expect(container.querySelector("section")).toHaveClass("admin-panel");
    expect(container.querySelector("li")?.className).toContain("2xl:grid-cols-");
    expect(container.querySelector("li")?.className).not.toContain("xl:grid-cols-[minmax(16rem");
  });
});
