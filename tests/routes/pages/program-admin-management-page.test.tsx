import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProgramDetailPage from "@/app/admin/programs/[programId]/page";

const { getCurrentActor, getSettings, getResults } = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  getSettings: vi.fn(),
  getResults: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/project-program/application/manage-project-programs", () => ({
  ProjectProgramService: class { getSettings = getSettings; },
}));
vi.mock("@/modules/project-voting/application/manage-project-voting", () => ({
  ProjectVotingService: class { getResults = getResults; },
}));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/modules/project-voting/infrastructure/prisma-project-voting-repository", () => ({ PrismaProjectVotingRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: { projectProgram: { findMany: vi.fn().mockResolvedValue([]) } } }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/_components/admin-workspace", () => ({
  AdminWorkspace: ({ eyebrow, title, description, actions, children }: { eyebrow?: string; title: string; description: string; actions: ReactNode; children: ReactNode }) => (
    <main><p>{eyebrow}</p><h1>{title}</h1><p>{description}</p>{actions}{children}</main>
  ),
}));
vi.mock("@/app/admin/programs/_components/program-policy-form", () => ({ ProgramPolicyForm: () => <section>등록·투표 정책</section> }));
vi.mock("@/app/admin/programs/_components/program-status-form", () => ({ ProgramStatusForm: () => <section>공개 및 마감</section> }));
vi.mock("@/app/admin/programs/_components/student-project-creation-form", () => ({ StudentProjectCreationForm: () => <section>학생 프로젝트 제안</section> }));
vi.mock("@/app/admin/programs/_components/program-icon-picker", () => ({ ProgramIconForm: () => <section>프로그램 아이콘</section> }));
vi.mock("@/app/admin/programs/_components/program-vote-results", () => ({ ProgramVoteResults: () => <div>투표 집계</div> }));
vi.mock("@/app/admin/programs/_components/program-report-requirement-form", () => ({ ProgramReportRequirementForm: () => <div>제출물 폼</div> }));
vi.mock("@/app/admin/programs/[programId]/rubric/_components/rubric-manager", () => ({ RubricManager: () => <div>채점표 관리</div> }));
vi.mock("@/app/admin/programs/[programId]/tracks/_components/track-manager", () => ({ TrackManager: () => <div>트랙 관리</div> }));

const admin = { id: "admin-1", name: "관리자", role: "ADMIN" as const };
const program = {
  id: "program-1",
  name: "캡스톤",
  category: "교과",
  description: "프로그램 설명",
  startsAt: new Date("2026-03-01T00:00:00.000Z"),
  endsAt: new Date("2026-06-30T00:00:00.000Z"),
  projectRegistrationStartsAt: new Date("2026-03-01T00:00:00.000Z"),
  projectRegistrationEndsAt: new Date("2026-05-31T00:00:00.000Z"),
  status: "OPEN" as const,
  topicCount: 2,
  teamCount: 1,
  advisorEnabled: true,
  studentProjectCreationEnabled: true,
  icon: "FOLDER" as const,
  isPublic: true,
  lifecycleStatus: "ACTIVE" as const,
  divisions: [],
  votingPolicy: {
    startsAt: new Date("2026-05-01T00:00:00.000Z"),
    endsAt: new Date("2026-05-31T00:00:00.000Z"),
    voteLimit: 3,
    selfVotingAllowed: false,
    identityVisibility: "ANONYMOUS" as const,
  },
};

describe("프로그램 통합 관리 화면", () => {
  beforeEach(() => {
    getCurrentActor.mockReset();
    getSettings.mockReset();
    getResults.mockReset();
    getCurrentActor.mockResolvedValue(admin);
    getSettings.mockResolvedValue(program);
    getResults.mockResolvedValue({});
  });

  it("설정 탭에서 운영 설정을 제공하고 득표현황은 투표 탭으로 분리한다", async () => {
    render(await ProgramDetailPage({ params: Promise.resolve({ programId: program.id }), searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "캡스톤" })).toBeInTheDocument();
    expect(screen.getByText("등록·투표 정책")).toBeInTheDocument();
    expect(screen.getByText("학생 프로젝트 제안")).toBeInTheDocument();
    expect(screen.getByText("프로그램 아이콘")).toBeInTheDocument();
    expect(screen.getByText("공개 및 마감")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "분과" })).toHaveAttribute("href", `/admin/programs/${program.id}?tab=tracks`);
    expect(screen.getByRole("link", { name: "투표" })).toHaveAttribute("href", `/admin/programs/${program.id}?tab=votes`);
    expect(screen.getByRole("link", { name: "채점표" })).toHaveAttribute("href", `/admin/programs/${program.id}?tab=rubric`);
    expect(screen.queryByText("투표 집계")).not.toBeInTheDocument();
    expect(getResults).not.toHaveBeenCalled();
  });

  it("투표 탭에서 득표현황을 보여준다", async () => {
    render(await ProgramDetailPage({ params: Promise.resolve({ programId: program.id }), searchParams: Promise.resolve({ tab: "votes" }) }));

    expect(screen.getByText("득표현황")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "투표" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("투표 집계")).toBeInTheDocument();
    expect(getResults).toHaveBeenCalledWith(admin, program.id);
  });

  it("투표 정책이 없으면 투표 탭에서 설정 진입점을 제공한다", async () => {
    getSettings.mockResolvedValue({ ...program, votingPolicy: null });

    render(await ProgramDetailPage({ params: Promise.resolve({ programId: program.id }), searchParams: Promise.resolve({ tab: "votes" }) }));

    expect(screen.getByRole("link", { name: "투표" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("투표 정책이 없는 프로그램입니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "투표 정책 설정" })).toHaveAttribute("href", `/admin/programs/${program.id}#voting-policy`);
    expect(getResults).not.toHaveBeenCalled();
  });
});
