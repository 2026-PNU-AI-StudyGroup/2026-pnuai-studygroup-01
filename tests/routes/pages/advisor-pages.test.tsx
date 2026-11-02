import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisorAssignmentsPage from "@/app/advisor/page";
import AdvisorProjectDetailPage from "@/app/advisor/[topicId]/page";

const { getCurrentActor, listAssignedProjects, findAssignedProject, findAdvisorReview, groupBy } = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listAssignedProjects: vi.fn(),
  findAssignedProject: vi.fn(),
  findAdvisorReview: vi.fn(),
  groupBy: { rubrics: vi.fn(), scored: vi.fn(), feedback: vi.fn() },
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn(), useRouter: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/advisor/infrastructure/prisma-advisor-workspace-query", () => ({ listAssignedProjects, findAssignedProject, findAdvisorReview }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    projectTeamRubricEvaluation: { groupBy: groupBy.rubrics },
    advisorEvaluation: { groupBy: groupBy.scored },
    advisorFeedback: { groupBy: groupBy.feedback },
  },
}));
vi.mock("@/app/advisor/_actions/advisor-review-actions", () => ({ saveAdvisorScoresAction: vi.fn(), addAdvisorFeedbackAction: vi.fn() }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/translation/ui/localized-markdown", () => ({ LocalizedMarkdown: ({ text }: { text: string }) => <p>{text}</p> }));
vi.mock("@/shared/ui/artifact-media", () => ({ ARTIFACT_TYPE_LABELS: { LINK: "링크" }, ArtifactMedia: () => null }));

const advisor = { id: "advisor-1", name: "정민서", email: "advisor@pusan.ac.kr", image: null, role: "ADVISOR" as const };
const program = { id: "program-1", name: "제7회 해커톤", endsAt: new Date("2099-12-31T00:00:00Z") };

describe("자문위원 담당 프로젝트 화면", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentActor.mockResolvedValue(advisor);
  });

  it("목록은 프로젝트마다 저장한 채점표 수를 세고 채점이 남은 수를 제목 아래에 적는다", async () => {
    listAssignedProjects.mockResolvedValue([
      { id: "topic-1", title: "길찾기", program, team: { id: "team-1", name: "길잡이", confirmedAt: new Date() } },
      { id: "topic-2", title: "분실물", program, team: { id: "team-2", name: "찾아줘", confirmedAt: null } },
      { id: "topic-3", title: "대피 안내", program, team: null },
    ]);
    groupBy.rubrics.mockResolvedValue([{ projectTeamId: "team-1", _count: { _all: 2 } }, { projectTeamId: "team-2", _count: { _all: 1 } }]);
    groupBy.scored.mockResolvedValue([{ projectTeamId: "team-1", _count: { _all: 1 } }, { projectTeamId: "team-2", _count: { _all: 1 } }]);
    groupBy.feedback.mockResolvedValue([{ projectTeamId: "team-2", _count: { _all: 3 } }]);

    render(await AdvisorAssignmentsPage());

    expect(screen.getByRole("heading", { level: 1, name: "담당 프로젝트" })).toBeInTheDocument();
    expect(screen.getByText("채점이 남은 프로젝트가 1개 있습니다.")).toBeInTheDocument();
    const first = screen.getByRole("heading", { name: "길찾기" }).closest("li")!;
    expect(within(first).getByText("1 / 2")).toBeInTheDocument();
    expect(within(first).getByRole("link")).toHaveAttribute("href", "/advisor/topic-1");
    expect(screen.getByRole("heading", { name: "분실물" }).closest("li")).toHaveTextContent("피드백 3건");
    expect(within(screen.getByRole("heading", { name: "대피 안내" }).closest("li")!).getByText("팀 미구성")).toBeInTheDocument();
    // 팀이 있는 프로젝트만 진행 정도를 묻는다.
    expect(groupBy.rubrics).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ projectTeamId: { in: ["team-1", "team-2"] } }) }));
  });

  it("배정이 없으면 표의 틀 안에 한 문장을 남긴다", async () => {
    listAssignedProjects.mockResolvedValue([]);

    render(await AdvisorAssignmentsPage());

    expect(screen.getByText("할당된 프로젝트가 없습니다")).toBeInTheDocument();
    expect(groupBy.rubrics).not.toHaveBeenCalled();
  });

  it("상세는 저장한 채점표 수와 채점 칸, 피드백 칸을 함께 보인다", async () => {
    findAssignedProject.mockResolvedValue({
      id: "topic-1",
      title: "길찾기",
      description: "설명",
      program,
      team: {
        id: "team-1",
        name: "길잡이",
        showcaseIntro: "팀 소개",
        artifacts: [],
        reports: [{ id: "report-1", titleSnapshot: "중간 보고서", versions: [] }],
      },
    });
    findAdvisorReview.mockResolvedValue({
      rubrics: [
        { id: "rubric-1", title: "기술성", gradingDueAt: new Date("2099-01-01T00:00:00Z"), criteria: [{ id: "c-1", label: "완성도", maxPoints: 10, points: 7 }] },
        { id: "rubric-2", title: "사업성", gradingDueAt: new Date("2099-01-01T00:00:00Z"), criteria: [{ id: "c-2", label: "시장성", maxPoints: 10, points: null }] },
      ],
      feedback: [],
    });

    render(await AdvisorProjectDetailPage({ params: Promise.resolve({ topicId: "topic-1" }) }));

    expect(screen.getByRole("heading", { level: 1, name: "길찾기" })).toBeInTheDocument();
    expect(screen.getByText("채점표 2개 중 1개를 저장했습니다.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "점수 저장" })).toHaveLength(2);
    expect(screen.getByRole("spinbutton", { name: /완성도/ })).toHaveValue(7);
    expect(screen.getByRole("textbox", { name: "팀에 남길 피드백" })).toBeInTheDocument();
    expect(screen.getByText("제출 전")).toBeInTheDocument();
  });
});
