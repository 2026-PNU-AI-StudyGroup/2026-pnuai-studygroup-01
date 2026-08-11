import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPortalHero } from "@/app/topics/_components/project-portal-chrome";

describe("ProjectPortalHero", () => {
  it("현재 탐색 화면의 히어로를 유지한다", () => {
    render(<ProjectPortalHero view="active" />);
    expect(screen.getByRole("heading", { name: "전체 프로젝트" })).toBeInTheDocument();
  });

  it("프로그램 정보에는 공통 일정을 표시하고 설명 부제목은 표시하지 않는다", () => {
    render(<ProjectPortalHero view="active" program={{
      name: "AI 부스터", category: "교육", description: "AI 부스터 프로그램 소개",
      startsAt: "2026-09-01T00:00:00+09:00", endsAt: "2026-12-31T23:59:00+09:00",
      projectRegistrationStartsAt: "2026-08-01T09:00:00+09:00", projectRegistrationEndsAt: "2026-08-31T18:00:00+09:00",
      recruitmentStartsAt: "2026-09-01T09:00:00+09:00", recruitmentEndsAt: "2026-09-30T18:00:00+09:00",
      executionStartsAt: "2026-09-15T09:00:00+09:00", executionEndsAt: "2026-11-30T18:00:00+09:00",
      submissionStartsAt: "2026-11-01T09:00:00+09:00", submissionEndsAt: "2026-12-15T18:00:00+09:00",
    }} />);

    const disclosure = screen.getByText("프로그램 정보").closest("details");
    expect(disclosure).toHaveTextContent("프로젝트 모집 기간");
    expect(disclosure).toHaveTextContent("수행 기간");
    expect(disclosure).toHaveTextContent("제출 기간");
    expect(disclosure).not.toHaveTextContent("AI 부스터 프로그램 소개");
  });
});
