import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TeamOverviewPage from "@/app/projects/[projectId]/page";

const { loadTeamWorkspace, listForProgram, resolveAnnouncementAudience, findTopic, findReports } = vi.hoisted(() => ({
  loadTeamWorkspace: vi.fn(),
  listForProgram: vi.fn(),
  resolveAnnouncementAudience: vi.fn(),
  findTopic: vi.fn(),
  findReports: vi.fn(),
}));

vi.mock("@/app/projects/[projectId]/_lib/team-workspace-data", () => ({
  loadTeamWorkspace,
}));

vi.mock("@/app/projects/[projectId]/_actions/team-project-info-actions", () => ({
  updateTeamProjectInfoAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { topic: { findUnique: findTopic }, report: { findMany: findReports } },
}));

vi.mock("@/app/projects/[projectId]/_actions/team-workspace-actions", () => ({
  confirmTeamAction: vi.fn(),
}));

vi.mock("@/shared/ui/person-avatar", () => ({
  PersonAvatar: ({ userId }: { userId: string }) => <span data-testid={`person-avatar-${userId}`} />,
}));

vi.mock("@/modules/announcement/infrastructure/announcement-audience", () => ({
  resolveAnnouncementAudience,
}));

vi.mock("@/modules/announcement/infrastructure/prisma-announcement-repository", () => ({
  PrismaAnnouncementRepository: class PrismaAnnouncementRepository {},
}));

vi.mock("@/modules/announcement/application/manage-announcements", () => ({
  AnnouncementService: class AnnouncementService {
    listForProgram = listForProgram;
  },
}));

const workspace = {
  id: "team-1",
  topicId: "topic-1",
  name: "모두의 길",
  programName: "2026 캡스톤디자인",
  topicTitle: "실내 길찾기",
  topicDescription: "누구나 이동할 수 있는 길을 안내합니다.",
  status: "IN_PROGRESS" as const,
  memberCount: 1,
  taskCount: 0,
  completedTaskCount: 0,
  reportCount: 0,
  submittedReportCount: 0,
  tasks: [],
  professorName: "김도윤",
  professor: { id: "professor-1", name: "김도윤", profileImage: null },
  advisorEnabled: false,
  canClose: false,
  access: {
    isPrimaryAdvisor: false,
    isAssistant: false,
    isTeamMember: true,
    isTeamLeader: false,
    canSupervise: false,
    canContribute: true,
  },
  schedule: {
    recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
    programRecruitmentEndsAt: new Date("2026-02-01T00:00:00Z"),
    executionStartsAt: new Date("2026-03-01T00:00:00Z"),
    executionEndsAt: new Date("2026-10-01T00:00:00Z"),
    submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
    submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
  },
  assistants: [],
  members: [{
    id: "student-1",
    name: "정하늘",
    role: "LEADER" as const,
    email: "student@pusan.ac.kr",
    department: "정보컴퓨터공학부",
    studentNumber: "202612345",
    grade: 3,
    phoneNumber: "010-1234-5678",
    contactEmail: "sky@example.com",
    profile: {
      interests: ["접근성", "교육"],
      skills: ["TypeScript", "Figma"],
      desiredRole: "프론트엔드 개발",
      availability: "평일 저녁",
      bio: "사용자 문제를 해결하고 싶습니다.",
    },
  }],
  discussionPosts: [],
  discussionPage: 1,
  discussionTotalPages: 1,
  discussionTotal: 0,
};

describe("TeamOverviewPage", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T00:00:00.000Z"));
    resolveAnnouncementAudience.mockResolvedValue({ role: "STUDENT", actorId: "student-1", teamIds: ["team-1"], programIds: [] });
    listForProgram.mockResolvedValue([]);
    findTopic.mockResolvedValue({ thumbnailPath: null, program: { icon: "FOLDER" }, projectTeam: { award: null } });
    findReports.mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  it("머리에 프로젝트 이름, 사업, 팀, 상태를 한 번씩 두고 방문자 화면으로 보낸다", async () => {
    loadTeamWorkspace.mockResolvedValue({ actor: { id: "student-1", role: "STUDENT" }, workspace });

    render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));

    const title = screen.getByRole("heading", { level: 1, name: "실내 길찾기" });
    expect(title).not.toHaveClass("sr-only");
    const header = screen.getByRole("region", { name: "실내 길찾기" });
    expect(header).toHaveTextContent("2026 캡스톤디자인, 모두의 길 팀");
    expect(screen.getByText("진행 중")).toHaveClass("bg-[var(--accent-subtle)]");
    expect(screen.getByRole("link", { name: "방문자 화면 보기" })).toHaveAttribute("href", "/topics/topic-1?view=public");
    expect(screen.getByRole("heading", { name: "프로그램 일정" })).toBeInTheDocument();
    // 연락처와 작업 메뉴는 팀 관리와 왼쪽 메뉴에 있다. 개요에 다시 싣지 않는다.
    expect(screen.queryByText("student@pusan.ac.kr")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "프로젝트 작업" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /회의·검토 요청/ })).not.toBeInTheDocument();
  });

  it("팀 칸에 지도교수, 조교, 팀원 이름만 두고 팀 관리로 보낸다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor: { id: "student-1", role: "STUDENT" },
      workspace: {
        ...workspace,
        advisorEnabled: true,
        assistants: [{ id: "assistant-1", name: "박조교", email: "assistant@pusan.ac.kr", profileImage: null }],
      },
    });

    render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));

    const team = screen.getByRole("region", { name: "팀" });
    expect(team).toHaveTextContent("김도윤");
    expect(screen.getByRole("list", { name: "프로젝트 조교" })).toHaveTextContent("박조교");
    expect(screen.getByRole("list", { name: "프로젝트 팀원" })).toHaveTextContent("정하늘팀장");
    expect(screen.queryByText("assistant@pusan.ac.kr")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "팀 관리" })).toHaveAttribute("href", "/projects/team-1/team");
  });

  it("팀장은 현재 프로젝트명으로 채운 수정 창을 열고, 팀원에게는 수정 단추를 막는다", async () => {
    loadTeamWorkspace.mockResolvedValue({ actor: { id: "student-1", role: "STUDENT" }, workspace: { ...workspace, access: { ...workspace.access, isTeamLeader: true } } });
    const { unmount } = render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));

    fireEvent.click(screen.getByRole("button", { name: "프로젝트 정보 수정" }));
    // 저장하면 주제 제목이 바뀐다. 팀 이름을 채워 두면 그대로 저장할 때 프로젝트명이 팀 이름으로 덮인다.
    expect(screen.getByRole("textbox", { name: "프로젝트명" })).toHaveValue("실내 길찾기");
    unmount();

    loadTeamWorkspace.mockResolvedValue({ actor: { id: "student-1", role: "STUDENT" }, workspace });
    render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));
    const button = screen.getByRole("button", { name: "프로젝트 정보 수정" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "팀장만 수정할 수 있습니다");
  });

  it("보고서 일정이 없으면 0/0 대신 일정이 없다고 적는다", async () => {
    loadTeamWorkspace.mockResolvedValue({ actor: { id: "student-1", role: "STUDENT" }, workspace });

    render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));

    expect(screen.getByText("보고서 일정 없음")).toBeInTheDocument();
    expect(screen.getByText("등록된 보고서 일정이 없습니다")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "보고서 제출률" })).not.toBeInTheDocument();
  });

  it("보고서 일정이 있으면 제출 수와 다음 마감을 머리에 적고 제출로 보낸다", async () => {
    loadTeamWorkspace.mockResolvedValue({ actor: { id: "student-1", role: "STUDENT" }, workspace });
    findReports.mockResolvedValue([
      { id: "report-1", titleSnapshot: "착수 보고서", dueAt: new Date("2026-07-20T00:00:00.000Z"), versions: [{ id: "v1" }] },
      { id: "report-2", titleSnapshot: "중간 보고서", dueAt: new Date("2026-08-06T00:00:00.000Z"), versions: [] },
    ]);

    render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));

    expect(screen.getByRole("progressbar", { name: "보고서 제출률" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("region", { name: "실내 길찾기" })).toHaveTextContent("다음 마감은 중간 보고서, 8월 6일(2일 남음)입니다.");
    expect(screen.getByRole("link", { name: "보고서 제출" })).toHaveAttribute("href", "/projects/team-1/reports");
  });

  it("감독자에게도 팀 대화와 보고서 목적지를 본문에서 반복하지 않는다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor: { id: "professor-1", role: "PROFESSOR" },
      workspace: {
        ...workspace,
        advisorEnabled: true,
        access: {
          ...workspace.access,
          isPrimaryAdvisor: true,
          isTeamMember: false,
          canSupervise: true,
          canContribute: false,
        },
      },
    });

    render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));

    expect(screen.queryByRole("link", { name: "지도 의견 남기기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "보고서 관리" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "조교 관리" })).not.toBeInTheDocument();
  });

  it("기한이 지난 활성 할 일을 상태와 담당자, 이동 링크가 있는 다음 행동으로 보여준다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      actor: { id: "student-1", role: "STUDENT" },
      workspace: {
        ...workspace,
        taskCount: 3,
        completedTaskCount: 1,
        tasks: [
          {
            id: "done",
            title: "완료한 조사",
            dueAt: new Date("2026-07-20T00:00:00.000Z"),
            status: "DONE" as const,
            assignees: [{ id: "student-1", name: "정하늘" }],
          },
          {
            id: "future-progress",
            title: "프로토타입 검증",
            dueAt: new Date("2026-08-20T00:00:00.000Z"),
            status: "IN_PROGRESS" as const,
            assignees: [{ id: "student-1", name: "정하늘" }],
          },
          {
            id: "overdue-todo",
            title: "지연된 데이터 정리",
            dueAt: new Date("2026-08-01T00:00:00.000Z"),
            status: "TODO" as const,
            assignees: [{ id: "student-2", name: "윤서준" }],
          },
        ],
      },
    });

    render(await TeamOverviewPage({ params: Promise.resolve({ projectId: "team-1" }) }));

    expect(screen.getByRole("heading", { name: "지연된 데이터 정리" })).toBeInTheDocument();
    expect(screen.getByText("기한 초과")).toBeInTheDocument();
    expect(screen.getByText("윤서준")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "실내 길찾기" })).toHaveTextContent("완료 예정일을 넘긴 할 일이 1개입니다.");
    expect(screen.getByRole("link", { name: "할 일 전체 보기" })).toHaveAttribute("href", "/projects/team-1/tasks");
  });
});
