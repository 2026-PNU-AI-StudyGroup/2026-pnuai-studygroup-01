import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProfessorTopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";

vi.mock("@/app/professor/applications/decision-buttons", () => ({
  DecisionButtons: ({ applicationId }: { applicationId: string }) => (
    <button type="button">{applicationId} 결정</button>
  ),
}));

import { ReceivedApplicationDetail } from "@/app/professor/applications/received-application-detail";
import { ReceivedApplicationList } from "@/app/professor/applications/received-application-list";

const application: ProfessorTopicApplicationSummary = {
  id: "application-1",
  topicId: "topic-1",
  topicTitle: "프로젝트 관리 시스템",
  topicAuthorId: "professor-1",
  studentId: "student-1",
  studentName: "김학생",
  studentEmail: "student@pusan.ac.kr",
  status: "PENDING",
  message: "영문 자료를 함께 읽고 제품 품질을 높이겠습니다.",
  skills: ["Next.js", "UX 리서치"],
  desiredRole: "프론트엔드",
  availability: "평일 저녁",
  createdAt: new Date("2026-07-17T09:00:00+09:00"),
};

describe("교수 지원서 목록과 상세", () => {
  it("목록은 판단에 필요한 요약과 상세 링크만 표시한다", () => {
    render(<ReceivedApplicationList applications={[application]} />);

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("프로젝트 관리 시스템")).toBeInTheDocument();
    expect(within(item).getByText("김학생")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: /지원서 상세 보기/ })).toHaveAttribute(
      "href",
      "/professor/applications/application-1",
    );
    expect(screen.queryByText(application.message)).not.toBeInTheDocument();
    expect(screen.queryByText("UX 리서치")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /결정/ })).not.toBeInTheDocument();
  });

  it("상세에서 지원자 정보와 번역 가능한 지원 동기 및 결정 동작을 표시한다", () => {
    render(<ReceivedApplicationDetail application={application} />);

    expect(screen.getByRole("heading", { name: application.topicTitle })).toBeInTheDocument();
    expect(screen.getByText(application.studentName)).toBeInTheDocument();
    expect(screen.getByText(application.studentEmail)).toBeInTheDocument();
    expect(screen.getByText(application.desiredRole)).toBeInTheDocument();
    expect(screen.getByText(application.availability)).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("UX 리서치")).toBeInTheDocument();
    expect(screen.getByText(application.message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "영어" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "application-1 결정" })).toBeInTheDocument();
  });
});
