import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPortalHero, ProjectStatusNavigation } from "@/app/topics/_components/project-portal-chrome";

describe("ProjectStatusNavigation", () => {
  it("상태를 바꿔도 프로그램·검색·정렬 조건을 보존한다", () => {
    render(<ProjectStatusNavigation phase="RECRUITING" counts={{ ACTIVE: 12, RECRUITING: 5, CLOSING_SOON: 2 }} programId="program-1" query="번역" sort="DEADLINE" />);

    const closing = screen.getByRole("link", { name: "마감 임박 2" });
    expect(closing).toHaveAttribute("href", "/topics?phase=CLOSING_SOON&programId=program-1&q=%EB%B2%88%EC%97%AD&sort=DEADLINE");
    expect(screen.getByRole("link", { name: "모집 중 5" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "전체 12" })).toBeInTheDocument();
  });
});

describe("ProjectPortalHero", () => {
  it("현재 탐색 화면의 히어로를 유지한다", () => {
    render(<ProjectPortalHero view="active" />);
    expect(screen.getByRole("heading", { name: "전체 프로젝트" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "내 지원서로 이동" })).not.toBeInTheDocument();
  });

  it("선택한 지난 프로그램의 이름과 분류를 히어로에 표시한다", () => {
    render(<ProjectPortalHero view="past" program={{ name: "CSE 캡스톤 디자인 2025", category: "캡스톤" }} />);

    expect(screen.getByRole("heading", { name: "CSE 캡스톤 디자인 2025" })).toBeInTheDocument();
    expect(screen.getByText("캡스톤 · 완료된 프로젝트와 결과물을 확인하세요.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "지난 프로젝트" })).not.toBeInTheDocument();
  });

  it("선택한 프로그램에서 전달한 프로젝트 생성 동작을 표시한다", () => {
    render(
      <ProjectPortalHero
        view="active"
        program={{ id: "program-1", name: "AI 부스터", category: "교육" }}
        action={<a href="/projects/new?programId=program-1">프로젝트 만들기</a>}
      />,
    );

    expect(screen.getByRole("link", { name: "프로젝트 만들기" })).toHaveAttribute("href", "/projects/new?programId=program-1");
  });

  it("선택한 프로그램 제목 아래에 운영·등록·투표 기간을 모두 표시한다", () => {
    render(
      <ProjectPortalHero
        view="active"
        program={{
          id: "program-1",
          name: "AI 부스터",
          category: "교육",
          startsAt: "2026-09-01T00:00:00+09:00",
          endsAt: "2026-12-31T23:59:00+09:00",
          projectRegistrationStartsAt: "2026-08-01T09:00:00+09:00",
          projectRegistrationEndsAt: "2026-08-31T18:00:00+09:00",
          votingPolicy: {
            startsAt: "2026-12-01T09:00:00+09:00",
            endsAt: "2026-12-07T18:00:00+09:00",
          },
        }}
      />,
    );

    const schedule = screen.getByText("운영 기간").closest("dl");
    expect(schedule).not.toBeNull();
    expect(screen.getByText("교육 · 현재 참여할 수 있는 프로젝트를 확인하세요.").nextElementSibling).toContainElement(schedule);
    expect(schedule).toHaveTextContent("운영 기간");
    expect(schedule).toHaveTextContent("프로젝트 등록 기간");
    expect(schedule).toHaveTextContent("투표 기간");
    expect(schedule).toHaveTextContent("2026. 8. 1. 09:00 – 2026. 8. 31. 18:00");
  });
});
