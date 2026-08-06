import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfessorApplicationsPage from "@/app/professor/applications/page";
import NewTopicPage from "@/app/professor/topics/new/page";
import ProfessorTopicsPage from "@/app/professor/topics/page";

const {
  listApplications,
  listOpenPrograms,
  listTopics,
  getCurrentActor,
  requireProfessorWorkspaceActor,
} = vi.hoisted(() => ({
  listApplications: vi.fn(),
  listOpenPrograms: vi.fn(),
  listTopics: vi.fn(),
  getCurrentActor: vi.fn(),
  requireProfessorWorkspaceActor: vi.fn(),
}));

vi.mock("@/app/professor/_lib/professor-workspace-access", () => ({
  requireProfessorWorkspaceActor,
}));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/app/_actions/create-topic-action", () => ({ createTopicAction: vi.fn() }));
vi.mock("@/modules/project-program/application/manage-project-programs", () => ({
  ProjectProgramService: class { listOpen = listOpenPrograms; },
}));
vi.mock("@/modules/topic/application/list-own-topics", () => ({
  ListOwnTopicsService: class { execute = listTopics; },
}));
vi.mock("@/modules/topic-application/application/list-received-topic-applications", () => ({
  ListReceivedTopicApplicationsService: class { execute = listApplications; },
}));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({
  PrismaProjectProgramRepository: class {},
}));
vi.mock("@/modules/topic/infrastructure/prisma-topic-query-repository", () => ({
  PrismaTopicQueryRepository: class {},
}));
vi.mock("@/modules/topic-application/infrastructure/prisma-topic-application-query-repository", () => ({
  PrismaTopicApplicationQueryRepository: class {},
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/app/professor/topics/_components/topic-status-button", () => ({
  TopicStatusButton: () => <button type="button">상태 변경</button>,
}));
vi.mock("@/modules/topic/ui/topic-form", () => ({ TopicForm: () => <form aria-label="주제 작성" /> }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
}));

const assistant = {
  id: "assistant-1",
  name: "박조교",
  email: "assistant@pusan.ac.kr",
  image: null,
  role: "STUDENT" as const,
};
const professor = { ...assistant, id: "professor-1", name: "김교수", role: "PROFESSOR" as const };

describe("학생 조교 교수 작업공간 페이지", () => {
  beforeEach(() => {
    requireProfessorWorkspaceActor.mockReset();
    listOpenPrograms.mockReset();
    listTopics.mockReset();
    listApplications.mockReset();
    getCurrentActor.mockReset();
    requireProfessorWorkspaceActor.mockResolvedValue(assistant);
  });

  it("배정된 주제만 조회하고 교수 전용 생성 행동을 숨긴다", async () => {
    listTopics.mockResolvedValue({
      page: 1,
      totalPages: 1,
      total: 1,
      items: [{
      id: "topic-1",
      programId: "program-1",
      authorId: "professor-1",
      authorName: "김도윤",
      authorRole: "PROFESSOR",
      title: "배정된 프로젝트",
      description: "설명",
      requiredSkills: [],
      preferredSkills: [],
      roleExpectations: "역할",
      availabilityRequirement: "시간",
      applicationMode: "INDIVIDUAL",
      recruitmentEnabled: true,
      applicationQuestions: [],
      capacity: 4,
      recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-08-15T00:00:00Z"),
      executionStartsAt: new Date("2026-08-16T00:00:00Z"),
      executionEndsAt: new Date("2026-11-30T00:00:00Z"),
      submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
      submissionEndsAt: new Date("2026-12-15T00:00:00Z"),
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-01T00:00:00Z"),
      programName: "캡스톤 2026",
      programCategory: "캡스톤",
      programStatus: "OPEN",
      advisorEnabled: true,
      pendingApplicationCount: 0,
      openRecruitmentPostCount: 0,
    }],
    });

    render(await ProfessorTopicsPage({ searchParams: Promise.resolve({}) }));

    expect(listTopics).toHaveBeenCalledWith(assistant, 1);
    expect(listOpenPrograms).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "담당 주제" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "배정된 프로젝트" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "새 주제 등록" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "학생 제안 검토" })).not.toBeInTheDocument();
  });

  it("배정된 주제의 지원서만 조교 문맥으로 조회한다", async () => {
    listApplications.mockResolvedValue({
      page: 1,
      totalPages: 1,
      total: 1,
      counts: { PENDING: 1, ACCEPTED: 0, REJECTED: 0 },
      items: [{
      id: "application-1",
      topicId: "topic-1",
      topicTitle: "배정된 프로젝트",
      studentName: "정하늘",
      status: "PENDING",
      applicationKind: "INDIVIDUAL",
      teamMemberCount: 1,
      createdAt: new Date("2026-07-05T00:00:00Z"),
      }],
    });

    render(await ProfessorApplicationsPage({ searchParams: Promise.resolve({}) }));

    expect(listApplications).toHaveBeenCalledWith(assistant, 1, 20, undefined, "");
    expect(screen.getByRole("heading", { name: "지원 검토" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "배정된 프로젝트" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "정하늘의 배정된 프로젝트 지원서 상세 보기" })).toHaveAttribute(
      "href",
      "/professor/applications/application-1",
    );
  });

  it("교수의 주제 목록이 비어 있으면 빈 상태에만 생성 진입점을 둔다", async () => {
    requireProfessorWorkspaceActor.mockResolvedValue(professor);
    listOpenPrograms.mockResolvedValue([{ id: "program-1" }]);
    listTopics.mockResolvedValue({ page: 1, totalPages: 1, total: 0, items: [] });

    render(await ProfessorTopicsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByRole("link", { name: "새 주제 등록" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "학생 제안 검토" })).toBeInTheDocument();
  });

  it("공개 프로그램이 없으면 새 주제 화면의 주제 목록 링크를 빈 상태에만 둔다", async () => {
    getCurrentActor.mockResolvedValue(professor);
    listOpenPrograms.mockResolvedValue([]);

    render(await NewTopicPage());

    expect(screen.getAllByRole("link", { name: "주제 목록" })).toHaveLength(1);
  });
});
