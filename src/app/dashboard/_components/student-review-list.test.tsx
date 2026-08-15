import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentReviewList } from "@/app/dashboard/_components/student-review-list";

const application = {
  id: "application-1",
  topicId: "topic-1",
  topicTitle: "캠퍼스 길찾기",
  topicStatus: "ACTIVE" as const,
  programName: "2026 캡스톤디자인",
  programStatus: "OPEN" as const,
  status: "PENDING" as const,
  reviewComment: "",
  message: "",
  skills: [],
  desiredRole: "",
  availability: "",
  applicationKind: "INDIVIDUAL" as const,
  teamMembers: [],
  answers: [],
  createdAt: new Date("2026-08-12T00:00:00Z"),
  decidedAt: null,
};

const registration = {
  id: "registration-1",
  topicId: "topic-2",
  topicTitle: "AI 학습 도우미",
  programId: "program-1",
  programName: "2026 캡스톤디자인",
  programCategory: "캡스톤",
  requesterId: "student-1",
  requesterName: "김학생",
  route: "ADMIN" as const,
  requestedProfessorId: null,
  requestedProfessorName: null,
  status: "PENDING" as const,
  reviewComment: "",
  createdAt: new Date("2026-08-13T00:00:00Z"),
  decidedAt: null,
  description: "학습 지원 프로젝트입니다.",
  projectTeam: {
    name: "AI 팀",
    members: [{ id: "student-1", name: "김학생", role: "LEADER" as const }],
  },
};

describe("StudentReviewList", () => {
  it("프로젝트 지원과 등록을 하나의 검토 중 목록으로 시간순 통합한다", () => {
    render(<StudentReviewList applications={[application]} registrations={[registration]} total={2} />);

    expect(screen.getAllByRole("heading", { name: "검토 중" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "AI 학습 도우미",
      "캠퍼스 길찾기",
    ]);
    expect(screen.getByText("프로젝트 등록")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 지원")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "등록 내용 보기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "캠퍼스 길찾기 프로젝트 보기" })).toHaveAttribute("href", "/topics/topic-1");
  });

  it("미리보기에서는 하나의 전체 보기 링크만 제공한다", () => {
    render(<StudentReviewList applications={[application]} registrations={[registration]} total={4} preview />);

    expect(screen.getByRole("link", { name: "검토 중 전체 보기" })).toHaveAttribute("href", "/dashboard?view=pending");
    expect(screen.queryByText("프로젝트 등록 검토")).not.toBeInTheDocument();
  });
});
