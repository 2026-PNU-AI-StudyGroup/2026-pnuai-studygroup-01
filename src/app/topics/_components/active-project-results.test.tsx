import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";

vi.mock("@/app/topics/_components/topic-application-editor", () => ({
  TopicApplicationEditor: () => <button type="button">지원</button>,
}));

const now = new Date("2026-07-27T00:00:00Z");

function topicsWithStatus(status: "PENDING" | "ACCEPTED" | "REJECTED", advisorEnabled = true): PublicTopicPage {
  return {
    page: 1,
    totalPages: 1,
    total: 1,
    counts: { ACTIVE: 1, RECRUITING: 1, CLOSING_SOON: 0 },
    items: [{
      id: "50000000-0000-4000-8000-000000000001",
      academicCycleId: "cycle-1",
      programId: "program-1",
      authorId: "professor-1",
      title: "실내 길찾기",
      description: "설명",
      requiredSkills: ["TypeScript"],
      preferredSkills: [],
      roleExpectations: "개발",
      availabilityRequirement: "주 1회",
      applicationMode: "INDIVIDUAL_ONLY",
      recruitmentEnabled: true,
      applicationQuestions: [{ id: "question-1", label: "동기", maxLength: 500, required: true }],
      capacity: 4,
      recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
      executionStartsAt: new Date("2026-08-01T00:00:00Z"),
      executionEndsAt: new Date("2026-11-30T00:00:00Z"),
      submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
      submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
      authorName: "김교수",
      authorRole: "PROFESSOR",
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-01T00:00:00Z"),
      programName: "캡스톤",
      programCategory: "교과",
      programStatus: "OPEN",
      advisorEnabled,
      academicYear: 2026,
      term: "FIRST",
      memberCount: 1,
      ownApplicationStatus: status,
    }],
  };
}

describe("ActiveProjectResults", () => {
  it("참여가 확정된 프로젝트는 이동 메시지 대신 비활성 참여 중 버튼을 표시한다", () => {
    render(
      <ActiveProjectResults
        topics={topicsWithStatus("ACCEPTED")}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
        programOrder={["program-1"]}
      />,
    );

    expect(screen.getByRole("button", { name: "참여 중" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: /프로젝트 참여 확정/ })).not.toBeInTheDocument();
  });

  it("지도교수가 없는 프로그램의 프로젝트 카드에는 교수 정보를 표시하지 않는다", () => {
    render(
      <ActiveProjectResults
        topics={topicsWithStatus("PENDING", false)}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
        programOrder={["program-1"]}
      />,
    );

    expect(screen.queryByText("김교수 교수")).not.toBeInTheDocument();
  });
});
