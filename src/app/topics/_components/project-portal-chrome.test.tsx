import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramScheduleCard, ProjectPortalHero } from "@/app/topics/_components/project-portal-chrome";

const program = {
  name: "AI 부스터 2기", category: "교육",
  startsAt: "2026-09-01T00:00:00+09:00", endsAt: "2026-12-31T23:59:00+09:00",
  projectRegistrationStartsAt: "2026-08-01T09:00:00+09:00", projectRegistrationEndsAt: "2026-08-31T18:00:00+09:00",
  recruitmentStartsAt: "2026-09-01T09:00:00+09:00", recruitmentEndsAt: "2026-09-30T18:00:00+09:00",
  executionStartsAt: "2026-09-15T09:00:00+09:00", executionEndsAt: "2026-11-30T18:00:00+09:00",
};

describe("ProjectPortalHero", () => {
  it("사업을 고르지 않았으면 전체 프로젝트 제목만 둔다", () => {
    render(<ProjectPortalHero view="active" />);
    expect(screen.getByRole("heading", { level: 1, name: "전체 프로젝트" })).toBeInTheDocument();
  });

  it("사업 이름의 회차를 표지에 얹고 분류, 한 줄 발견, 할 일 버튼을 함께 둔다", () => {
    render(<ProjectPortalHero view="active" program={program} finding="모집은 9월 30일에 마감합니다." actions={<a href="/x">보고서 현황</a>} />);

    const header = screen.getByRole("region", { name: "AI 부스터 2기" });
    expect(within(header).getByText("기")).toBeInTheDocument();
    expect(header).toHaveTextContent("교육");
    expect(header).toHaveTextContent("모집은 9월 30일에 마감합니다.");
    expect(within(header).getByRole("link", { name: "보고서 현황" })).toBeInTheDocument();
  });
});

describe("ProgramScheduleCard", () => {
  it("겹치는 기간 중 가장 좁은 지금 기간 하나에만 표시를 단다", () => {
    render(<ProgramScheduleCard program={program} now={new Date("2026-09-20T12:00:00+09:00")} />);

    const schedule = screen.getByRole("region", { name: "일정" });
    expect(schedule).toHaveTextContent("모집");
    expect(schedule).toHaveTextContent("수행");
    expect(within(schedule).getAllByText("지금")).toHaveLength(1);
    expect(within(schedule).getByText("지금").closest("li")).toHaveTextContent("수행");
  });
});
