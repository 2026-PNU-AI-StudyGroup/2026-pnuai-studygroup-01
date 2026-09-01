import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ArchivedProject,
  ArchivedProjectReader,
  ArchiveFilters,
} from "@/modules/team/application/archive-projects";
import { getProgramStartYear } from "@/modules/project-program/domain/project-program-policy";
import {
  canShowPopularAward,
  pickPopularAwardTopicIds,
} from "@/modules/project-voting/domain/project-voting-policy";

const archivedProjectSelect = {
  id: true,
  name: true,
  showcaseIntro: true,
  award: true,
  archivedVoteCount: true,
  project: { select: {
    id: true,
    title: true,
    description: true,
    advisorRole: true,
    sourceUrl: true,
    thumbnailPath: true,
    posterPath: true,
    divisionId: true,
    division: { select: { name: true } },
    program: { select: { id: true, name: true, category: true, advisorEnabled: true, startsAt: true, votingPolicy: { select: { endsAt: true, resultsVisibleAfterVoting: true } } } },
    manager: { select: { name: true } },
  } },
  memberships: {
    where: { endedAt: null },
    orderBy: { joinedAt: "asc" as const },
    select: { role: true, user: { select: { name: true } } },
  },
  artifacts: {
    orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
    select: {
      id: true,
      type: true,
      title: true,
      fileId: true,
      externalUrl: true,
      position: true,
      file: { select: { originalName: true } },
    },
  },
} satisfies Prisma.ProjectTeamSelect;

type ArchivedProjectRow = Prisma.ProjectTeamGetPayload<{
  select: typeof archivedProjectSelect;
}>;

export class PrismaTeamArchiveQueryRepository
  implements ArchivedProjectReader
{
  constructor(
    private readonly client: PrismaClient,
    private readonly audience: "STUDENT" | "FACULTY" | "ADMIN" = "STUDENT",
  ) {}

  async listProgramCategories(): Promise<string[]> {
    const programs = await this.client.projectProgram.findMany({
      where: {
        ...programVisibilityWhere(this.audience),
        endsAt: { lte: new Date() },
        topics: { some: { projectTeam: { confirmedAt: { not: null } } } },
      },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    });
    return programs.map(({ category }) => category);
  }

  async listPrograms() {
    const programs = await this.client.projectProgram.findMany({
      where: {
        ...programVisibilityWhere(this.audience),
        endsAt: { lte: new Date() },
        topics: { some: { projectTeam: { confirmedAt: { not: null } } } },
      },
      orderBy: [
        { startsAt: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        category: true,
        icon: true,
        startsAt: true,
        endsAt: true,
        projectRegistrationStartsAt: true,
        projectRegistrationEndsAt: true,
        votingPolicy: { select: { startsAt: true, endsAt: true } },
        divisions: { orderBy: { position: "asc" }, select: { id: true, name: true } },
      },
    });
    return programs.map((program) => ({
      ...program,
      startYear: getProgramStartYear(program.startsAt),
    }));
  }

  async countClosed(filters: ArchiveFilters): Promise<number> {
    return this.client.projectTeam.count({
      where: closedProjectWhere(filters, this.audience),
    });
  }

  async listClosed(input: {
    offset: number;
    limit: number;
    filters: ArchiveFilters;
  }): Promise<ArchivedProject[]> {
    const teams = await this.client.projectTeam.findMany({
      where: closedProjectWhere(input.filters, this.audience),
      orderBy: [
        { project: { program: { startsAt: "desc" } } },
        { name: "asc" },
        { id: "asc" },
      ],
      skip: input.offset,
      take: input.limit,
      select: archivedProjectSelect,
    });
    const popular = await this.popularAwardTopicIds(teams);
    return teams.map((team) => toArchivedProject(team, this.audience, popular));
  }

  /**
   * 인기상을 받는 주제를 프로그램별로 골라 둔다.
   *
   * 수상 내역에 적힌 값이 아니라 표에서 뽑는다. 손으로 넣어 두면 표가 바뀔 때마다 따라
   * 고쳐야 하고, 그 일이 곧 3차 피드백에서 지적받은 "부수적인 업무"가 된다.
   *
   * 투표를 돌린 프로그램은 그 설정을 따른다. 투표가 끝나고 결과를 공개하기로 한 곳에서만
   * 붙인다. 옮겨 온 지난 대회는 설정이 없는 대신 이미 끝난 행사이고, 여기 오는 프로그램은
   * 모두 종료된 것들이라 그대로 쓴다.
   *
   * 표를 세는 곳이 두 군데다. 이 시스템에서 투표한 대회는 `ProjectVote` 에 한 장씩 남고,
   * 옮겨 온 대회는 팀에 합계(`archivedVoteCount`)만 적혀 있다. 둘 다 봐야 한다.
   */
  private async popularAwardTopicIds(teams: ArchivedProjectRow[]): Promise<Set<string>> {
    const programIds = [...new Set(teams.map((team) => team.project.program.id))];
    if (programIds.length === 0) return new Set();

    const now = new Date();
    const policies = await this.client.programVotingPolicy.findMany({
      where: { programId: { in: programIds } },
      select: {
        programId: true,
        startsAt: true,
        endsAt: true,
        voteLimit: true,
        selfVotingAllowed: true,
        resultsVisibleDuringVoting: true,
        resultsVisibleAfterVoting: true,
      },
    });
    const policyByProgram = new Map(policies.map((policy) => [policy.programId, policy]));
    const eligible = programIds.filter((programId) => {
      const policy = policyByProgram.get(programId);
      return policy ? canShowPopularAward(policy, now) : true;
    });
    if (eligible.length === 0) return new Set();

    // 화면에 보이는 팀만이 아니라 프로그램 전체를 세야 순위가 맞는다. 목록은 쪽으로 나뉜다.
    const [tallies, archived] = await Promise.all([
      this.client.projectVote.groupBy({
        by: ["programId", "topicId"],
        where: { programId: { in: eligible } },
        _count: { _all: true },
      }),
      this.client.projectTeam.findMany({
        where: {
          confirmedAt: { not: null },
          archivedVoteCount: { not: null },
          project: { programId: { in: eligible } },
        },
        select: { archivedVoteCount: true, project: { select: { id: true, programId: true } } },
      }),
    ]);

    const byProgram = new Map<string, Map<string, number>>();
    const put = (programId: string, topicId: string, votes: number) => {
      const entries = byProgram.get(programId) ?? new Map<string, number>();
      entries.set(topicId, votes);
      byProgram.set(programId, entries);
    };
    for (const team of archived) put(team.project.programId, team.project.id, team.archivedVoteCount!);
    // 실제로 들어온 표가 있으면 그쪽이 이긴다. 보관 합계는 옮겨 올 때 한 번 적힌 값이다.
    for (const row of tallies) put(row.programId, row.topicId, row._count._all);

    const picked = new Set<string>();
    for (const entries of byProgram.values()) {
      const rows = [...entries].map(([topicId, votes]) => ({ topicId, votes }));
      for (const topicId of pickPopularAwardTopicIds(rows)) picked.add(topicId);
    }
    return picked;
  }

  async findClosed(id: string): Promise<ArchivedProject | null> {
    const team = await this.client.projectTeam.findFirst({
      where: {
        projectId: id,
        confirmedAt: { not: null },
        project: { program: { ...programVisibilityWhere(this.audience), endsAt: { lte: new Date() } } },
      },
      select: archivedProjectSelect,
    });
    if (!team) return null;
    return toArchivedProject(team, this.audience, await this.popularAwardTopicIds([team]));
  }

}

function toArchivedProject(
  team: ArchivedProjectRow,
  audience: "STUDENT" | "FACULTY" | "ADMIN",
  popularAwardTopicIds: Set<string>,
): ArchivedProject {
  return {
    id: team.project.id,
    topicId: team.project.id,
    startYear: getProgramStartYear(team.project.program.startsAt),
    teamName: team.name,
    programId: team.project.program.id,
    programName: team.project.program.name,
    programCategory: team.project.program.category,
    divisionId: team.project.divisionId,
    divisionName: team.project.division?.name ?? null,
    topicTitle: team.project.title,
    topicDescription: team.project.description,
    professorName: team.project.manager!.name,
    advisorRole: team.project.advisorRole,
    advisorEnabled: team.project.program.advisorEnabled,
    // 화면은 첫 사람을 팀장으로 보여 준다. 승인 시 모든 구성원의 합류 시각이 같아
    // 들어온 순서만으로는 팀장이 앞에 온다는 보장이 없다. 팀장을 앞으로 끌어 둔다.
    memberNames: [...team.memberships]
      .sort((left, right) => Number(right.role === "LEADER") - Number(left.role === "LEADER"))
      .map(({ user }) => user.name),
    sourceUrl: team.project.sourceUrl ?? undefined,
    thumbnailPath: team.project.thumbnailPath ?? undefined,
    posterPath: team.project.posterPath ?? undefined,
    showcaseIntro: team.showcaseIntro ?? undefined,
    award: team.award ?? undefined,
    // 손으로 이미 적어 둔 팀에는 겹쳐 붙이지 않는다. 같은 상이 두 번 뜬다.
    popularAward: popularAwardTopicIds.has(team.project.id) && !(team.award ?? "").includes("인기상"),
    archivedVoteCount: canSeeVoteCount(team.project.program.votingPolicy, audience)
      ? team.archivedVoteCount ?? undefined
      : undefined,
    artifacts: team.artifacts.map(({ file, ...artifact }) => ({
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      fileId: artifact.fileId ?? undefined,
      fileName: file?.originalName,
      externalUrl: artifact.externalUrl ?? undefined,
      position: artifact.position,
    })),
  };
}

// 득표수는 관리자에게 항상 보이고, 그 밖에는 프로그램의 "마감 후 득표 공개" 설정을 따른다.
// 이관한 지난 대회는 투표 설정이 없어 관리자만 본다.
function canSeeVoteCount(
  policy: { endsAt: Date; resultsVisibleAfterVoting: boolean } | null,
  audience: "STUDENT" | "FACULTY" | "ADMIN",
): boolean {
  if (audience === "ADMIN") return true;
  if (!policy) return false;
  return policy.resultsVisibleAfterVoting && policy.endsAt <= new Date();
}

function closedProjectWhere(
  filters: ArchiveFilters,
  audience: "STUDENT" | "FACULTY" | "ADMIN" = "STUDENT",
): Prisma.ProjectTeamWhereInput {
  const conditions: Prisma.ProjectTeamWhereInput[] = [];
  if (filters.programId) {
    conditions.push({ project: { programId: filters.programId } });
  }
  if (filters.programCategory) {
    conditions.push({
      project: { program: { category: filters.programCategory } },
    });
  }
  if (filters.divisionId === "UNASSIGNED") {
    conditions.push({ project: { divisionId: null } });
  } else if (filters.divisionId) {
    conditions.push({ project: { divisionId: filters.divisionId } });
  }
  if (filters.query) {
    const query = filters.query;
    conditions.push({ OR: [
      { name: { contains: query, mode: "insensitive" } },
      {
        project: {
          author: { name: { contains: query, mode: "insensitive" } },
          program: { advisorEnabled: true },
        },
      },
      { project: { title: { contains: query, mode: "insensitive" } } },
      { project: { description: { contains: query, mode: "insensitive" } } },
      { artifacts: { some: { title: { contains: query, mode: "insensitive" } } } },
    ] });
  }
  return {
    confirmedAt: { not: null },
    project: { program: { ...programVisibilityWhere(audience), endsAt: { lte: new Date() } } },
    AND: conditions,
  };
}

function programVisibilityWhere(audience: "STUDENT" | "FACULTY" | "ADMIN") {
  if (audience === "ADMIN") return {};
  return { isPublic: true };
}
