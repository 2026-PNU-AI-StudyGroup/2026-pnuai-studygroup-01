import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProfessorTopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";

vi.mock("@/app/professor/applications/_components/decision-form", () => ({
  ApplicationDecisionForm: ({ applicationId }: { applicationId: string }) => (
    <button type="button">{applicationId} 결정</button>
  ),
}));
vi.mock("@/app/_components/translated-text", () => ({
  TranslatedText: ({ text }: { text: string }) => <p>{text}</p>,
}));

import { ReceivedApplicationDetail } from "@/app/professor/applications/_components/received-application-detail";
import { ReceivedApplicationList } from "@/app/professor/applications/_components/received-application-list";

const application: ProfessorTopicApplicationSummary = {
  id: "application-1",
  topicId: "topic-1",
  topicTitle: "프로젝트 관리 시스템",
      topicManagerId: "professor-1",
      topicAssistantIds: [],
  studentId: "student-1",
  studentName: "김학생",
  studentEmail: "student@pusan.ac.kr",
  status: "PENDING",
  reviewComment: "",
  message: "영문 자료를 함께 읽고 제품 품질을 높이겠습니다.",
  skills: ["Next.js", "UX 리서치"],
  desiredRole: "프론트엔드",
  availability: "평일 저녁",
  applicationKind: "INDIVIDUAL",
  teamMembers: [{ studentId: "student-1", name: "김학생", email: "student@pusan.ac.kr", role: "LEADER" }],
  answers: [{ questionId: "question-1", label: "지원 동기", required: true, maxLength: 300, value: "영문 자료를 함께 읽고 제품 품질을 높이겠습니다." }],
  createdAt: new Date("2026-07-17T09:00:00+09:00"),
  decidedAt: null,
  decidedByName: null,
  decisionImpact: {
    acceptedMemberCount: 1,
    currentMemberCount: 2,
    capacity: 4,
    automaticallyRejectedApplicationCount: 0,
    closesRecruitment: false,
  },
};

const listItem = {
  id: application.id,
  topicId: application.topicId,
  topicTitle: application.topicTitle,
  status: application.status,
  studentName: application.studentName,
  applicationKind: application.applicationKind,
  teamMemberCount: application.teamMembers.length,
  createdAt: application.createdAt,
};

function applicationPage(item = listItem) {
  return {
    items: [item],
    page: 1,
    totalPages: 1,
    total: 1,
    counts: { PENDING: item.status === "PENDING" ? 1 : 0, ACCEPTED: item.status === "ACCEPTED" ? 1 : 0, REJECTED: item.status === "REJECTED" ? 1 : 0 },
  };
}

describe("교수 지원서 목록과 상세", () => {
  it("목록은 판단에 필요한 요약과 행 전체 상세 링크를 표시한다", () => {
    render(<ReceivedApplicationList page={applicationPage()} query="" />);

    const item = within(screen.getByRole("list", { name: "지원서 결과" })).getByRole("listitem");
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

  it.each([
    ["ACCEPTED", "선정", "bg-[var(--success-subtle)]"],
    ["REJECTED", "미선정", "bg-[var(--danger-subtle)]"],
  ] as const)("%s 결과를 canonical 배지로 표시한다", (status, label, toneClass) => {
    render(<ReceivedApplicationList page={applicationPage({ ...listItem, status })} status={status} query="" />);

    const resultList = screen.getByRole("list", { name: "지원서 결과" });
    expect(within(resultList).getByText(label)).toHaveClass(toneClass);
  });

  it("상세에서 지원자와 교수 지정 문항 답변 및 결정 동작을 표시한다", () => {
    render(<ReceivedApplicationDetail application={application} />);

    expect(screen.getByRole("heading", { name: application.topicTitle })).toBeInTheDocument();
    expect(screen.getByText(application.studentName)).toBeInTheDocument();
    expect(screen.getByText(application.studentEmail)).toBeInTheDocument();
    expect(screen.getByText("지원 동기")).toBeInTheDocument();
    expect(screen.getByText(application.answers[0].value)).toBeInTheDocument();
    expect(screen.queryByText(application.desiredRole)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "영어" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "결정과 의견 전달" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "application-1 결정" })).toBeInTheDocument();
  });
});
