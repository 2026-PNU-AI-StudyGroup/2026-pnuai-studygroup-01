import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgramManagementHeader } from "@/app/topics/_management/program-management-workspace";

vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/modules/project-voting/infrastructure/prisma-project-voting-repository", () => ({ PrismaProjectVotingRepository: class {} }));

const program = {
  id: "program-1",
  name: "2026 캡스톤",
  isPublic: true,
  endsAt: new Date("2099-12-31T00:00:00Z"),
};

describe("ProgramManagementHeader", () => {
  it("승인 대기가 있으면 해당 프로그램의 대기 요청으로 연결한다", () => {
    render(<ProgramManagementHeader program={program} tab="settings" pendingApprovalCount={2} />);

    expect(screen.getByRole("link", { name: "승인 대기 2건 검토하기" })).toHaveAttribute(
      "href",
      "/project-approvals?programId=program-1&status=PENDING",
    );
  });

  it("승인 대기가 없으면 검토 링크를 표시하지 않는다", () => {
    render(<ProgramManagementHeader program={program} tab="settings" pendingApprovalCount={0} />);

    expect(screen.queryByRole("link", { name: /승인 대기/ })).not.toBeInTheDocument();
  });

  it("제목 왼쪽의 돌아가기 아이콘으로 탐색 화면으로 돌아갈 수 있다", () => {
    render(<ProgramManagementHeader program={program} tab="settings" pendingApprovalCount={0} />);

    expect(screen.getByRole("link", { name: "2026 캡스톤 프로젝트 목록으로 돌아가기" })).toHaveAttribute(
      "href",
      "/topics?programId=program-1",
    );
  });

  it("위 줄에는 설정, 보고서, 평가 세 칸만 둔다", () => {
    render(<ProgramManagementHeader program={program} tab="settings" pendingApprovalCount={0} />);

    const tabs = screen.getByRole("navigation", { name: "프로그램 관리 탭" });
    expect(within(tabs).getAllByRole("link").map((link) => link.textContent)).toEqual(["설정", "보고서", "평가"]);
    expect(within(tabs).getByRole("link", { name: "설정" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "평가" })).toHaveAttribute("href", "/topics/manage/program-1/votes");
    expect(screen.queryByRole("navigation", { name: "평가 화면" })).not.toBeInTheDocument();
  });

  it("평가 안에서는 투표, 채점표, 집계, 자문위원을 아래 줄로 나눈다", () => {
    render(<ProgramManagementHeader program={program} tab="advisors" pendingApprovalCount={0} />);

    expect(within(screen.getByRole("navigation", { name: "프로그램 관리 탭" })).getByRole("link", { name: "평가" })).toHaveAttribute("aria-current", "page");
    const evaluation = screen.getByRole("navigation", { name: "평가 화면" });
    expect(within(evaluation).getAllByRole("link").map((link) => link.textContent)).toEqual(["투표", "채점표", "집계", "자문위원"]);
    expect(within(evaluation).getByRole("link", { name: "자문위원" })).toHaveAttribute("aria-current", "page");
  });
});
